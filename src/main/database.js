const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database path - will be set properly when initDB is called
let dbPath;
let db;

// Get the correct database path based on whether app is packaged
const getDbPath = (app) => {
    if (app && app.isPackaged) {
        // In packaged app, use userData folder (e.g., C:\Users\<user>\AppData\Roaming\Workshop Pro)
        return path.join(app.getPath('userData'), 'workshop.db');
    }
    // In development, use current working directory
    return path.join(process.cwd(), 'workshop.db');
};

const initDB = (app) => {
  // Set the database path now that app is ready
  dbPath = getDbPath(app);
  console.log("Database path:", dbPath);
  
  db = new sqlite3.Database(dbPath);
  
  db.serialize(() => {
    console.log("Checking database tables...");
    
    // Vehicles (added UNIQUE constraint on license_plate for the UPSERT logic)
    db.run(`CREATE TABLE IF NOT EXISTS vehicles (
      vehicle_id INTEGER PRIMARY KEY AUTOINCREMENT,
      license_plate TEXT UNIQUE,
      vin TEXT,
      make_model TEXT,
      current_owner TEXT,
      contact_number TEXT,
      photo_path TEXT,
      is_archived BOOLEAN DEFAULT 0
    )`);

    // Users (with hourly_rate for labor costing)
    db.run(`CREATE TABLE IF NOT EXISTS users (
      user_id INTEGER PRIMARY KEY AUTOINCREMENT,
      full_name TEXT,
      role TEXT,
      pin TEXT UNIQUE,
      hourly_rate DECIMAL(10,2) DEFAULT 0.00
    )`);

    // Inventory
    db.run(`CREATE TABLE IF NOT EXISTS inventory (
      part_id INTEGER PRIMARY KEY AUTOINCREMENT,
      part_name TEXT,
      part_number TEXT UNIQUE,
      total_quantity INTEGER DEFAULT 0,
      avg_cost DECIMAL(10,2) DEFAULT 0.00,
      retail_price DECIMAL(10,2) DEFAULT 0.00,
      min_threshold INTEGER DEFAULT 5,
      category TEXT,
      condition TEXT DEFAULT 'new',
      photo_path TEXT
    )`);

    // Add columns if they don't exist (for existing databases)
    db.run(`ALTER TABLE inventory ADD COLUMN condition TEXT DEFAULT 'new'`, (err) => {});
    db.run(`ALTER TABLE inventory ADD COLUMN photo_path TEXT`, (err) => {});
    db.run(`ALTER TABLE jobs ADD COLUMN taxi_cost REAL DEFAULT 0`, (err) => {});
    db.run(`ALTER TABLE jobs ADD COLUMN owner_name TEXT`, (err) => {});
    db.run(`ALTER TABLE jobs ADD COLUMN owner_phone TEXT`, (err) => {});
    db.run(`ALTER TABLE jobs ADD COLUMN invoice_number TEXT`, (err) => {});

    // Jobs
    db.run(`CREATE TABLE IF NOT EXISTS jobs (
      job_id INTEGER PRIMARY KEY AUTOINCREMENT,
      vehicle_id INTEGER NOT NULL,
      technician_id INTEGER,
      status TEXT DEFAULT 'pending',
      mileage_in INTEGER,
      mileage_out INTEGER,
      labor_hours REAL DEFAULT 0,
      labor_cost REAL DEFAULT 0,
      taxi_cost REAL DEFAULT 0,
      total_price DECIMAL(10,2) DEFAULT 0.00,
      owner_name TEXT,
      owner_phone TEXT,
      invoice_number TEXT,
      completion_date DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(vehicle_id) REFERENCES vehicles(vehicle_id) ON DELETE CASCADE,
      FOREIGN KEY(technician_id) REFERENCES users(user_id) ON DELETE SET NULL
    )`);

    // Tasks & Parts
    db.run(`CREATE TABLE IF NOT EXISTS job_tasks (
      task_id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_id INTEGER NOT NULL,
      description TEXT,
      is_completed BOOLEAN DEFAULT 0,
      FOREIGN KEY(job_id) REFERENCES jobs(job_id) ON DELETE CASCADE
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS job_parts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_id INTEGER NOT NULL,
      part_id INTEGER NOT NULL,
      qty INTEGER,
      price_at_sale DECIMAL(10,2),
      cost_at_sale DECIMAL(10,2),
      FOREIGN KEY(job_id) REFERENCES jobs(job_id) ON DELETE CASCADE,
      FOREIGN KEY(part_id) REFERENCES inventory(part_id) ON DELETE RESTRICT
    )`);

    // Ownership History (tracks vehicle ownership transfers)
    db.run(`CREATE TABLE IF NOT EXISTS ownership_history (
      history_id INTEGER PRIMARY KEY AUTOINCREMENT,
      vehicle_id INTEGER NOT NULL,
      old_owner TEXT,
      new_owner TEXT,
      mileage_at_transfer INTEGER,
      transfer_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(vehicle_id) REFERENCES vehicles(vehicle_id) ON DELETE CASCADE
    )`);

    // Job Images (damage photos, notes, etc. - multiple per job)
    db.run(`CREATE TABLE IF NOT EXISTS job_images (
      image_id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_id INTEGER NOT NULL,
      image_path TEXT NOT NULL,
      caption TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(job_id) REFERENCES jobs(job_id) ON DELETE CASCADE
    )`);

    // Labor Charges (tracks time entries per job)
    db.run(`CREATE TABLE IF NOT EXISTS labor_charges (
      labor_id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_id INTEGER NOT NULL,
      technician_id INTEGER NOT NULL,
      hours_worked DECIMAL(5,2),
      hourly_rate DECIMAL(10,2),
      total_labor_cost DECIMAL(10,2),
      recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(job_id) REFERENCES jobs(job_id) ON DELETE CASCADE,
      FOREIGN KEY(technician_id) REFERENCES users(user_id) ON DELETE SET NULL
    )`);

    // Default Tech
    db.run("INSERT OR IGNORE INTO users (full_name, role, pin) VALUES (?, ?, ?)", ["Head Tech", "technician", "1234"]);
    
    // CRITICAL: Add indexes on foreign keys for query performance and data integrity
    db.run("CREATE INDEX IF NOT EXISTS idx_jobs_vehicle ON jobs(vehicle_id)");
    db.run("CREATE INDEX IF NOT EXISTS idx_jobs_technician ON jobs(technician_id)");
    db.run("CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status)");
    db.run("CREATE INDEX IF NOT EXISTS idx_job_tasks_job ON job_tasks(job_id)");
    db.run("CREATE INDEX IF NOT EXISTS idx_job_parts_job ON job_parts(job_id)");
    db.run("CREATE INDEX IF NOT EXISTS idx_job_parts_part ON job_parts(part_id)");
    db.run("CREATE INDEX IF NOT EXISTS idx_labor_charges_job ON labor_charges(job_id)");
    db.run("CREATE INDEX IF NOT EXISTS idx_labor_charges_tech ON labor_charges(technician_id)");
    db.run("CREATE INDEX IF NOT EXISTS idx_ownership_vehicle ON ownership_history(vehicle_id)");
    db.run("CREATE INDEX IF NOT EXISTS idx_job_images_job ON job_images(job_id)");
    
    console.log("Database initialized successfully.");
  });
};

// Export functions to get db and path since they're created dynamically
const getDb = () => db;
const getPath = () => dbPath;

module.exports = { initDB, getDb, getPath };