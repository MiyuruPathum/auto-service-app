const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const express = require('express');
const AdmZip = require('adm-zip');
const { initDB, getDb, getPath } = require('./database');

// These will be set after app is ready
let uploadsDir;
let db;
let dbPath;

let mainWindow = null;

function createWindow() {
  // Determine icon path based on packaged or development mode
  const iconPath = app.isPackaged 
    ? path.join(process.resourcesPath, 'icon.ico')
    : path.join(__dirname, '../../build/icon.ico');

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 950,
    icon: iconPath,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  
  // Open DevTools only in development mode (not when packaged)
  if (!app.isPackaged) {
    mainWindow.webContents.openDevTools({ mode: 'right' });
  }
  
  // Fix for focus issues - ensure window stays responsive
  mainWindow.on('blur', () => {
    // When app loses focus and regains, ensure inputs work
  });
  
  mainWindow.on('focus', () => {
    // Force focus to webContents when window gains focus
    mainWindow.webContents.focus();
  });

  // Additional focus fix: periodically check and restore focus if needed
  // This helps when modals close or state changes cause focus loss
  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.webContents.focus();
  });

  // Handle focus restoration after dialogs/alerts
  mainWindow.webContents.on('did-frame-finish-load', () => {
    if (mainWindow.isFocused()) {
      mainWindow.webContents.focus();
    }
  });

  // Periodic focus check - every 3 seconds, ensure webContents has focus if window is focused
  setInterval(() => {
    if (mainWindow && !mainWindow.isDestroyed() && mainWindow.isFocused()) {
      mainWindow.webContents.focus();
    }
  }, 3000);
}

app.whenReady().then(() => {
  // Initialize database with app reference
  initDB(app);
  db = getDb();
  dbPath = getPath();
  
  // Set uploads directory now that app is ready
  uploadsDir = app.isPackaged 
    ? path.join(app.getPath('userData'), 'uploads')
    : path.join(process.cwd(), 'uploads');
  
  // Ensure uploads directory exists
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  
  createWindow();
  startExpressServer();
});

// IPC Handler for SELECT queries
ipcMain.handle('db-query', async (event, { sql, params = [] }) => {
    return new Promise((resolve) => {
        try {
            // INPUT VALIDATION: Ensure SQL is valid
            if (!sql || typeof sql !== 'string') {
                return resolve({ success: false, error: 'Invalid SQL' });
            }
            
            // Ensure params is an array
            const validParams = Array.isArray(params) ? params : [];
            
            // Sanitize: Check for common injection patterns
            if (sql.includes('--') || sql.includes('/*') || sql.includes('*/')) {
                return resolve({ success: false, error: 'Invalid SQL syntax' });
            }
            
            db.all(sql, validParams, (err, rows) => {
                if (err) {
                    console.error("SQL Error (Query):", err.message);
                    resolve({ success: false, error: err.message });
                } else {
                resolve({ success: true, data: rows });
                }
            });
        } catch (error) {
            console.error("DB-Query Exception:", error.message);
            resolve({ success: false, error: error.message });
        }
    });
});

// IPC Handler for INSERT/UPDATE/DELETE
ipcMain.handle('db-run', async (event, { sql, params = [] }) => {
    return new Promise((resolve) => {
        try {
            // INPUT VALIDATION: Basic SQL injection prevention
            if (!sql || typeof sql !== 'string') {
                return resolve({ success: false, error: 'Invalid SQL' });
            }
            
            // Ensure params is an array
            const validParams = Array.isArray(params) ? params : [];
            
            // Sanitize: Check for common injection patterns in SQL
            if (sql.includes('--') || sql.includes('/*') || sql.includes('*/')) {
                return resolve({ success: false, error: 'Invalid SQL syntax' });
            }
            
            db.run(sql, validParams, function(err) {
                if (err) {
                    console.error("SQL Error (Run):", err.message);
                    resolve({ success: false, error: err.message });
                } else {
                    console.log("SQL Success. Changes:", this.changes, "LastID:", this.lastID);
                    resolve({ success: true, id: this.lastID, changes: this.changes });
                }
            });
        } catch (error) {
            console.error("DB-Run Exception:", error.message);
            resolve({ success: false, error: error.message });
        }
    });
});

// IPC Handler for Stock Receipt with Weighted Average Cost (WAC)
ipcMain.handle('stock-receipt', async (event, { partNumber, quantity, cost, retailPrice, category }) => {
    return new Promise((resolve) => {
        db.serialize(() => {
            // Check if part exists
            db.get(
                "SELECT part_id, total_quantity, avg_cost FROM inventory WHERE part_number = ?",
                [partNumber],
                (err, row) => {
                    if (err) {
                        console.error("Stock Receipt Error:", err.message);
                        resolve({ success: false, error: err.message });
                        return;
                    }

                    if (row) {
                        // Part exists: calculate new WAC
                        const currentQty = row.total_quantity;
                        const currentAvg = row.avg_cost;
                        const newQty = quantity;
                        const newCost = cost;
                        
                        const newWAC = ((currentQty * currentAvg) + (newQty * newCost)) / (currentQty + newQty);
                        const newTotal = currentQty + newQty;
                        
                        db.run(
                            "UPDATE inventory SET total_quantity = ?, avg_cost = ? WHERE part_number = ?",
                            [newTotal, newWAC.toFixed(2), partNumber],
                            function(updateErr) {
                                if (updateErr) {
                                    console.error("WAC Update Error:", updateErr.message);
                                    resolve({ success: false, error: updateErr.message });
                                } else {
                                    console.log(`Updated ${partNumber}: WAC=${newWAC.toFixed(2)}, Total Qty=${newTotal}`);
                                    resolve({ success: true, wac: newWAC.toFixed(2), totalQty: newTotal });
                                }
                            }
                        );
                    } else {
                        // New part: insert with provided cost as initial WAC
                        db.run(
                            "INSERT INTO inventory (part_name, part_number, total_quantity, avg_cost, retail_price, category) VALUES (?, ?, ?, ?, ?, ?)",
                            [partNumber, partNumber, quantity, cost.toFixed(2), retailPrice || 0, category || "General"],
                            function(insertErr) {
                                if (insertErr) {
                                    console.error("New Part Insert Error:", insertErr.message);
                                    resolve({ success: false, error: insertErr.message });
                                } else {
                                    console.log(`Added new part ${partNumber}: Qty=${quantity}, Cost=${cost}`);
                                    resolve({ success: true, partId: this.lastID, wac: cost.toFixed(2), totalQty: quantity });
                                }
                            }
                        );
                    }
                }
            );
        });
    });
});

// IPC Handler for Adding Stock to Existing Inventory (Used in Job Screen)
ipcMain.handle('inventory-add-stock', async (event, { partId, quantityToAdd }) => {
    return new Promise((resolve) => {
        db.get(
            "SELECT part_id, part_number, total_quantity, avg_cost FROM inventory WHERE part_id = ?",
            [partId],
            (err, row) => {
                if (err) {
                    console.error("Inventory Add Stock Error:", err.message);
                    resolve({ success: false, error: err.message });
                    return;
                }

                if (!row) {
                    resolve({ success: false, error: `Part ID ${partId} not found` });
                    return;
                }

                // Simply increment quantity (deduction when adding to job)
                const newQuantity = row.total_quantity - quantityToAdd;
                if (newQuantity < 0) {
                    resolve({ success: false, error: `Insufficient stock for part ${row.part_number}. Available: ${row.total_quantity}` });
                    return;
                }

                db.run(
                    "UPDATE inventory SET total_quantity = ? WHERE part_id = ?",
                    [newQuantity, partId],
                    function(updateErr) {
                        if (updateErr) {
                            console.error("Inventory Update Error:", updateErr.message);
                            resolve({ success: false, error: updateErr.message });
                        } else {
                            console.log(`Deducted ${quantityToAdd} from part ${row.part_number}. New qty: ${newQuantity}`);
                            resolve({ success: true, newQuantity: newQuantity, partNumber: row.part_number });
                        }
                    }
                );
            }
        );
    });
});

// IPC Handler for Photo Upload
ipcMain.handle('upload-photo', async (event, { fileName, base64Data }) => {
    return new Promise((resolve) => {
        try {
            if (!base64Data) {
                resolve({ success: false, error: "Missing base64Data" });
                return;
            }

            // Generate filename if not provided
            const timestamp = Date.now();
            const defaultName = fileName || 'photo.jpg';
            const sanitizedName = `photo_${timestamp}_${defaultName.replace(/[^a-z0-9._-]/gi, '_')}`;
            const filePath = path.join(uploadsDir, sanitizedName);

            // Remove data URL prefix if present
            const base64String = base64Data.replace(/^data:image\/\w+;base64,/, '');
            const buffer = Buffer.from(base64String, 'base64');

            fs.writeFile(filePath, buffer, (err) => {
                if (err) {
                    console.error("Photo Upload Error:", err.message);
                    resolve({ success: false, error: err.message });
                } else {
                    console.log(`Photo saved: ${sanitizedName}`);
                    // Return ABSOLUTE path for proper file:// protocol display
                    resolve({ success: true, filePath: filePath });
                }
            });
        } catch (err) {
            console.error("Photo Upload Exception:", err.message);
            resolve({ success: false, error: err.message });
        }
    });
});

// IPC Handler: Record Labor Charges (CRITICAL - NEW)
ipcMain.handle('record-labor', async (event, { jobId, technicianId, hoursWorked, hourlyRate }) => {
    return new Promise((resolve) => {
        try {
            // INPUT VALIDATION: Sanitize and validate all inputs
            if (!jobId || !technicianId || hoursWorked === undefined || !hourlyRate) {
                return resolve({ success: false, error: 'Missing required fields' });
            }
            
            const jobIdNum = parseInt(jobId);
            const techIdNum = parseInt(technicianId);
            const hoursNum = parseFloat(hoursWorked);
            const rateNum = parseFloat(hourlyRate);
            
            if (isNaN(jobIdNum) || isNaN(techIdNum) || isNaN(hoursNum) || isNaN(rateNum)) {
                return resolve({ success: false, error: 'Invalid data types' });
            }
            
            if (hoursNum <= 0 || hoursNum > 24) {
                return resolve({ success: false, error: 'Hours must be between 0 and 24' });
            }
            
            if (rateNum < 0 || rateNum > 10000) {
                return resolve({ success: false, error: 'Invalid hourly rate' });
            }

            const totalCost = parseFloat((hoursNum * rateNum).toFixed(2));
            
            db.run(
                'INSERT INTO labor_charges (job_id, technician_id, hours_worked, hourly_rate, total_labor_cost) VALUES (?, ?, ?, ?, ?)',
                [jobId, technicianId, parseFloat(hoursWorked), parseFloat(hourlyRate), totalCost],
                function(err) {
                    if (err) {
                        console.error('Labor Record Error:', err.message);
                        resolve({ success: false, error: err.message });
                    } else {
                        console.log(`Labor recorded: Job${jobId}, ${hoursWorked}h @ ${hourlyRate}/h = ${totalCost}`);
                        resolve({ success: true, laborCost: totalCost });
                    }
                }
            );
        } catch (error) {
            console.error('Record Labor Exception:', error.message);
            resolve({ success: false, error: error.message });
        }
    });
});

// IPC Handler: Update Job Status with Validation (CRITICAL - NEW)
ipcMain.handle('update-job-status', async (event, { jobId, newStatus, mileageOut }) => {
    return new Promise((resolve) => {
        try {
            const validStatuses = ['pending', 'in-progress', 'waiting', 'completed'];
            if (!validStatuses.includes(newStatus)) {
                return resolve({ success: false, error: `Invalid status. Must be: ${validStatuses.join(', ')}` });
            }

            db.serialize(() => {
                db.get('SELECT status, mileage_in FROM jobs WHERE job_id = ?', [jobId], (err, job) => {
                    if (err || !job) {
                        return resolve({ success: false, error: 'Job not found' });
                    }

                    const validTransitions = {
                        'pending': ['in-progress', 'completed'],
                        'in-progress': ['waiting', 'completed'],
                        'waiting': ['in-progress', 'completed'],
                        'completed': []
                    };

                    if (!validTransitions[job.status] || !validTransitions[job.status].includes(newStatus)) {
                        return resolve({ success: false, error: `Cannot transition from ${job.status} to ${newStatus}` });
                    }

                    if (newStatus === 'completed' && mileageOut !== undefined && mileageOut !== null) {
                        if (parseInt(mileageOut) < job.mileage_in) {
                            return resolve({ success: false, error: `Exit mileage cannot be less than entry mileage` });
                        }
                    }

                    const sql = mileageOut !== undefined && mileageOut !== null
                        ? 'UPDATE jobs SET status = ?, mileage_out = ? WHERE job_id = ?'
                        : 'UPDATE jobs SET status = ? WHERE job_id = ?';

                    const params = mileageOut !== undefined && mileageOut !== null
                        ? [newStatus, mileageOut, jobId]
                        : [newStatus, jobId];

                    db.run(sql, params, function(updateErr) {
                        if (updateErr) {
                            console.error('Status Update Error:', updateErr.message);
                            resolve({ success: false, error: updateErr.message });
                        } else {
                            console.log(`Job ${jobId} status: ${job.status} → ${newStatus}`);
                            resolve({ success: true, oldStatus: job.status, newStatus });
                        }
                    });
                });
            });
        } catch (error) {
            console.error('Update Status Exception:', error.message);
            resolve({ success: false, error: error.message });
        }
    });
});

// IPC Handler: Get Technician's Assigned Jobs Only (CRITICAL - NEW)
ipcMain.handle('get-tech-jobs', async (event, { technicianId }) => {
    return new Promise((resolve) => {
        const sql = `SELECT j.job_id, j.vehicle_id, j.technician_id, j.status, j.mileage_in, j.created_at,
                            v.license_plate, v.make_model, 
                            COALESCE(j.owner_name, 
                              (SELECT oh.old_owner FROM ownership_history oh 
                               WHERE oh.vehicle_id = j.vehicle_id AND oh.transfer_date > j.created_at 
                               ORDER BY oh.transfer_date ASC LIMIT 1),
                              v.current_owner) as current_owner, 
                            COALESCE(j.owner_phone, v.contact_number) as contact_number
                     FROM jobs j
                     JOIN vehicles v ON j.vehicle_id = v.vehicle_id
                     WHERE j.technician_id = ? AND j.status != 'completed'
                     ORDER BY j.created_at DESC`;
        
        db.all(sql, [technicianId], (err, rows) => {
            if (err) {
                console.error('Get Tech Jobs Error:', err.message);
                resolve({ success: false, error: err.message });
            } else {
                console.log(`Retrieved ${rows.length} active jobs for tech ${technicianId}`);
                resolve({ success: true, data: rows || [] });
            }
        });
    });
});

// Express Server for Tablet/Mobile Access
function startExpressServer() {
    const expressApp = express();
    const PORT = 3000;

    // Middleware
    expressApp.use(express.static(path.join(__dirname, '../renderer')));
    expressApp.use('/lib', express.static(path.join(__dirname, '../renderer/lib')));
    expressApp.use('/uploads', express.static(uploadsDir));
    expressApp.use(express.json());

    // Universal Database API Endpoint (mirrors IPC handlers)
    expressApp.post('/api/db', async (req, res) => {
        const { type, payload } = req.body;
        
        try {
            if (type === 'db-query') {
                const { sql, params = [] } = payload;
                db.all(sql, params, (err, rows) => {
                    if (err) return res.json({ success: false, error: err.message });
                    res.json({ success: true, data: rows });
                });
            } else if (type === 'db-run') {
                const { sql, params = [] } = payload;
                db.run(sql, params, function(err) {
                    if (err) return res.json({ success: false, error: err.message });
                    res.json({ success: true, id: this.lastID, changes: this.changes });
                });
            } else if (type === 'update-job-status') {
                const { jobId, newStatus, mileageOut } = payload;
                let sql = "UPDATE jobs SET status = ?";
                let params = [newStatus];
                if (mileageOut) { sql += ", mileage_out = ?"; params.push(mileageOut); }
                if (newStatus === 'completed') { sql += ", completion_date = CURRENT_TIMESTAMP"; }
                sql += " WHERE job_id = ?";
                params.push(jobId);
                db.run(sql, params, function(err) {
                    if (err) return res.json({ success: false, error: err.message });
                    res.json({ success: true, changes: this.changes });
                });
            } else if (type === 'record-labor') {
                const { jobId, technicianId, hoursWorked, hourlyRate } = payload;
                const totalCost = hoursWorked * hourlyRate;
                db.run(
                    "INSERT INTO labor_charges (job_id, technician_id, hours_worked, hourly_rate, total_labor_cost) VALUES (?, ?, ?, ?, ?)",
                    [jobId, technicianId, hoursWorked, hourlyRate, totalCost],
                    function(err) {
                        if (err) return res.json({ success: false, error: err.message });
                        res.json({ success: true, laborId: this.lastID, totalCost });
                    }
                );
            } else if (type === 'backup-database') {
                // Not supported in web - Electron only
                res.json({ success: false, error: 'Backup only available in desktop app' });
            } else if (type === 'get-tech-jobs') {
                const { technicianId } = payload;
                db.all(
                    `SELECT j.*, v.license_plate, v.make_model 
                     FROM jobs j 
                     JOIN vehicles v ON j.vehicle_id = v.vehicle_id 
                     WHERE j.technician_id = ? AND j.status IN ('pending', 'in-progress')
                     ORDER BY j.created_at DESC`,
                    [technicianId],
                    (err, rows) => {
                        if (err) return res.json({ success: false, error: err.message });
                        res.json({ success: true, data: rows });
                    }
                );
            } else {
                res.json({ success: false, error: `Unknown operation: ${type}` });
            }
        } catch (error) {
            res.json({ success: false, error: error.message });
        }
    });

    // Technician Login Endpoint (for web access)
    expressApp.post('/api/tech-login', (req, res) => {
        const { pin } = req.body;
        if (!pin) return res.status(400).json({ success: false, error: 'PIN required' });
        
        db.get("SELECT * FROM users WHERE pin = ? AND role = 'technician'", [pin], (err, row) => {
            if (err) return res.status(500).json({ success: false, error: err.message });
            if (!row) return res.status(401).json({ success: false, error: 'Invalid PIN' });
            res.json({ success: true, data: row });
        });
    });

    // Get Suggestions Endpoint
    expressApp.get('/api/suggestions/:type', (req, res) => {
        const { type } = req.params;
        let sql = '';

        if (type === 'owners') {
            sql = "SELECT DISTINCT current_owner FROM vehicles WHERE current_owner IS NOT NULL ORDER BY current_owner";
        } else if (type === 'models') {
            sql = "SELECT DISTINCT make_model FROM vehicles WHERE make_model IS NOT NULL ORDER BY make_model";
        } else if (type === 'parts') {
            sql = "SELECT DISTINCT part_name FROM inventory WHERE part_name IS NOT NULL ORDER BY part_name";
        }

        if (!sql) return res.status(400).json({ success: false, error: 'Invalid type' });

        db.all(sql, [], (err, rows) => {
            if (err) return res.status(500).json({ success: false, error: err.message });
            res.json({ success: true, data: rows });
        });
    });

    // Serve index.html for all routes (SPA)
    expressApp.get('/', (req, res) => {
        res.sendFile(path.join(__dirname, '../renderer/index.html'));
    });

    expressApp.listen(PORT, '0.0.0.0', () => {
        console.log(`Express server running on http://0.0.0.0:${PORT}`);
        console.log(`Access from technician devices: http://[YOUR-PC-IP]:${PORT}`);
    });
}

// IPC Handler for Database Backup
ipcMain.handle('backup-database', async () => {
    return new Promise(async (resolve) => {
        try {
            const result = await dialog.showSaveDialog({
                title: 'Backup Database',
                defaultPath: `workshop_backup_${new Date().toISOString().split('T')[0]}.db`,
                filters: [{ name: 'SQLite Database', extensions: ['db'] }]
            });
            
            if (result.canceled) {
                resolve({ success: false, error: 'Cancelled' });
                return;
            }
            
            fs.copyFileSync(dbPath, result.filePath);
            console.log(`Database backed up to: ${result.filePath}`);
            resolve({ success: true, path: result.filePath });
        } catch (error) {
            console.error('Backup Error:', error.message);
            resolve({ success: false, error: error.message });
        }
    });
});

// IPC Handler for Uploads Backup (create zip)
ipcMain.handle('backup-uploads', async () => {
    return new Promise(async (resolve) => {
        try {
            const result = await dialog.showSaveDialog({
                title: 'Backup Uploads Folder',
                defaultPath: `uploads_backup_${new Date().toISOString().split('T')[0]}.zip`,
                filters: [{ name: 'ZIP Archive', extensions: ['zip'] }]
            });
            
            if (result.canceled) {
                resolve({ success: false, error: 'Cancelled' });
                return;
            }
            
            const zip = new AdmZip();
            zip.addLocalFolder(uploadsDir, 'uploads');
            zip.writeZip(result.filePath);
            
            const stats = fs.statSync(result.filePath);
            console.log(`Uploads backed up to: ${result.filePath} (${stats.size} bytes)`);
            resolve({ success: true, path: result.filePath, size: stats.size });
        } catch (error) {
            console.error('Uploads Backup Error:', error.message);
            resolve({ success: false, error: error.message });
        }
    });
});

// IPC Handler for Database Restore
ipcMain.handle('restore-database', async () => {
    return new Promise(async (resolve) => {
        try {
            const result = await dialog.showOpenDialog({
                title: 'Select Database Backup to Restore',
                filters: [{ name: 'SQLite Database', extensions: ['db'] }],
                properties: ['openFile']
            });
            
            if (result.canceled || result.filePaths.length === 0) {
                resolve({ success: false, error: 'Cancelled' });
                return;
            }
            
            const backupPath = result.filePaths[0];
            
            // Close the current database connection
            db.close((err) => {
                if (err) {
                    console.error('Error closing database:', err.message);
                }
                
                // Create a backup of current database before restore
                const currentBackupPath = dbPath + '.pre_restore_backup';
                if (fs.existsSync(dbPath)) {
                    fs.copyFileSync(dbPath, currentBackupPath);
                }
                
                // Copy the backup file to the database location
                fs.copyFileSync(backupPath, dbPath);
                console.log(`Database restored from: ${backupPath}`);
                
                resolve({ success: true, path: backupPath, requiresRestart: true });
            });
        } catch (error) {
            console.error('Restore Error:', error.message);
            resolve({ success: false, error: error.message });
        }
    });
});

// IPC Handler for Uploads Restore (extract zip)
ipcMain.handle('restore-uploads', async () => {
    return new Promise(async (resolve) => {
        try {
            const result = await dialog.showOpenDialog({
                title: 'Select Uploads Backup to Restore',
                filters: [{ name: 'ZIP Archive', extensions: ['zip'] }],
                properties: ['openFile']
            });
            
            if (result.canceled || result.filePaths.length === 0) {
                resolve({ success: false, error: 'Cancelled' });
                return;
            }
            
            const zipPath = result.filePaths[0];
            
            // Create backup of current uploads before restore
            const uploadsBackupDir = uploadsDir + '_pre_restore_backup';
            if (fs.existsSync(uploadsDir)) {
                if (fs.existsSync(uploadsBackupDir)) {
                    fs.rmSync(uploadsBackupDir, { recursive: true });
                }
                fs.renameSync(uploadsDir, uploadsBackupDir);
            }
            
            // Create fresh uploads directory
            fs.mkdirSync(uploadsDir, { recursive: true });
            
            // Extract the zip
            const zip = new AdmZip(zipPath);
            zip.extractAllTo(process.cwd(), true);
            
            console.log(`Uploads restored from: ${zipPath}`);
            resolve({ success: true, path: zipPath });
        } catch (error) {
            console.error('Uploads Restore Error:', error.message);
            resolve({ success: false, error: error.message });
        }
    });
});

// IPC Handler to restart app
ipcMain.handle('restart-app', async () => {
    app.relaunch();
    app.exit(0);
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });