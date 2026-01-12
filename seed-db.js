const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(process.cwd(), 'workshop.db');
const db = new sqlite3.Database(dbPath);

// Initialize database schema first
const initSchema = () => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
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

      db.run(`CREATE TABLE IF NOT EXISTS users (
        user_id INTEGER PRIMARY KEY AUTOINCREMENT,
        full_name TEXT,
        role TEXT,
        pin TEXT UNIQUE,
        hourly_rate DECIMAL(10,2) DEFAULT 0.00
      )`);

      db.run(`CREATE TABLE IF NOT EXISTS inventory (
        part_id INTEGER PRIMARY KEY AUTOINCREMENT,
        part_name TEXT,
        part_number TEXT UNIQUE,
        total_quantity INTEGER DEFAULT 0,
        avg_cost DECIMAL(10,2) DEFAULT 0.00,
        retail_price DECIMAL(10,2) DEFAULT 0.00,
        min_threshold INTEGER DEFAULT 5,
        category TEXT
      )`);

      db.run(`CREATE TABLE IF NOT EXISTS jobs (
        job_id INTEGER PRIMARY KEY AUTOINCREMENT,
        vehicle_id INTEGER NOT NULL,
        technician_id INTEGER,
        status TEXT DEFAULT 'pending',
        mileage_in INTEGER,
        mileage_out INTEGER,
        labor_hours REAL DEFAULT 0,
        labor_cost REAL DEFAULT 0,
        total_price DECIMAL(10,2) DEFAULT 0.00,
        completion_date DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(vehicle_id) REFERENCES vehicles(vehicle_id) ON DELETE CASCADE,
        FOREIGN KEY(technician_id) REFERENCES users(user_id) ON DELETE SET NULL
      )`);

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

      db.run(`CREATE TABLE IF NOT EXISTS ownership_history (
        history_id INTEGER PRIMARY KEY AUTOINCREMENT,
        vehicle_id INTEGER NOT NULL,
        old_owner TEXT,
        new_owner TEXT,
        mileage_at_transfer INTEGER,
        transfer_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(vehicle_id) REFERENCES vehicles(vehicle_id) ON DELETE CASCADE
      )`);

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
      )`, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  });
};

// Clear all tables
const clearDB = () => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run('DELETE FROM labor_charges');
      db.run('DELETE FROM job_parts');
      db.run('DELETE FROM job_tasks');
      db.run('DELETE FROM jobs');
      db.run('DELETE FROM ownership_history');
      db.run('DELETE FROM inventory');
      db.run('DELETE FROM users');
      db.run('DELETE FROM vehicles', (err) => {
        if (err) reject(err);
        else {
          console.log('✓ Database cleared');
          resolve();
        }
      });
    });
  });
};

// Insert dummy data
const seedDB = () => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Users - Technicians & Manager
      const users = [
        { full_name: 'Arjun Perera', role: 'technician', pin: '1234', hourly_rate: 850 },
        { full_name: 'Kumara Silva', role: 'technician', pin: '5678', hourly_rate: 950 },
        { full_name: 'Priyanka Jayawardene', role: 'technician', pin: '9101', hourly_rate: 1000 },
        { full_name: 'Roshan Weerasinghe', role: 'technician', pin: '1121', hourly_rate: 900 },
        { full_name: 'Samantha Rathnayake', role: 'manager', pin: '0000', hourly_rate: 0 }
      ];

      const userStmt = db.prepare('INSERT INTO users (full_name, role, pin, hourly_rate) VALUES (?, ?, ?, ?)');
      users.forEach(u => userStmt.run(u.full_name, u.role, u.pin, u.hourly_rate));
      userStmt.finalize();
      console.log('✓ Users added');

      // Vehicles - Sri Lankan license plates with Peugeot models (workshop is Peugeot-exclusive)
      const vehicles = [
        { license_plate: 'CAB-4567', vin: 'JTHBP5H2X45037821', make_model: 'Peugeot 308 (2018)', current_owner: 'W.M. Perera', contact_number: '0771234567' },
        { license_plate: 'WP-LA-1234', vin: 'MBLHA07F7A5103456', make_model: 'Peugeot 3008 (2020)', current_owner: 'K. Jayawardena', contact_number: '0712345678' },
        { license_plate: 'MTR-5890', vin: 'NMTGH7EX2D0089123', make_model: 'Peugeot 2008 (2019)', current_owner: 'R. Silva', contact_number: '0765432109' },
        { license_plate: 'KTY-2341', vin: '5TDJKRFH0LS234562', make_model: 'Peugeot 307 (2021)', current_owner: 'A. Weerasinghe', contact_number: '0723456789' },
        { license_plate: 'JJC-8901', vin: '3VWFE21C75M456789', make_model: 'Peugeot 508 (2017)', current_owner: 'S. Rathnayake', contact_number: '0781234567' },
        { license_plate: 'NWP-3456', vin: 'BHREVC000L1234567', make_model: 'Peugeot 208 (2019)', current_owner: 'D. Fernando', contact_number: '0756789012' }
      ];

      const vehicleStmt = db.prepare('INSERT INTO vehicles (license_plate, vin, make_model, current_owner, contact_number) VALUES (?, ?, ?, ?, ?)');
      vehicles.forEach(v => vehicleStmt.run(v.license_plate, v.vin, v.make_model, v.current_owner, v.contact_number));
      vehicleStmt.finalize();
      console.log('✓ Vehicles added');

      // Inventory - Auto parts
      const parts = [
        { part_name: 'Spark Plug Set (4 pcs)', part_number: 'NGK-BP6ES', total_quantity: 15, avg_cost: 450, retail_price: 850, category: 'Electrical' },
        { part_name: 'Oil Filter', part_number: 'OIL-FL-001', total_quantity: 20, avg_cost: 280, retail_price: 550, category: 'Maintenance' },
        { part_name: 'Air Filter', part_number: 'AIR-FL-002', total_quantity: 18, avg_cost: 320, retail_price: 650, category: 'Maintenance' },
        { part_name: 'Battery (12V 50Ah)', part_number: 'BAT-50AH', total_quantity: 8, avg_cost: 4500, retail_price: 8500, category: 'Electrical' },
        { part_name: 'Brake Pads Front', part_number: 'BRAKE-FRT-01', total_quantity: 12, avg_cost: 1200, retail_price: 2200, category: 'Brakes' },
        { part_name: 'Coolant (1L)', part_number: 'COOL-1L-RED', total_quantity: 25, avg_cost: 350, retail_price: 750, category: 'Cooling' },
        { part_name: 'Windshield Wiper Blades', part_number: 'WIPER-24IN', total_quantity: 14, avg_cost: 420, retail_price: 900, category: 'Exterior' },
        { part_name: 'Tire Sealant (500ml)', part_number: 'TIRE-SL-500', total_quantity: 10, avg_cost: 890, retail_price: 1800, category: 'Tires' },
        { part_name: 'Transmission Fluid (1L)', part_number: 'TRANS-FL-1L', total_quantity: 12, avg_cost: 1100, retail_price: 2100, category: 'Fluids' },
        { part_name: 'Alternator Belt', part_number: 'BELT-ALT-001', total_quantity: 9, avg_cost: 850, retail_price: 1600, category: 'Engine' }
      ];

      const partStmt = db.prepare('INSERT INTO inventory (part_name, part_number, total_quantity, avg_cost, retail_price, category) VALUES (?, ?, ?, ?, ?, ?)');
      parts.forEach(p => partStmt.run(p.part_name, p.part_number, p.total_quantity, p.avg_cost, p.retail_price, p.category));
      partStmt.finalize();
      console.log('✓ Inventory added');

      // Jobs - Various statuses
      const jobsData = [
        { vehicle_id: 1, technician_id: 1, status: 'completed', mileage_in: 45200, mileage_out: 45250, labor_hours: 2.5, labor_cost: 2125, total_price: 5850 },
        { vehicle_id: 2, technician_id: 2, status: 'in-progress', mileage_in: 32100, mileage_out: null, labor_hours: 0, labor_cost: 0, total_price: 0 },
        { vehicle_id: 3, technician_id: 3, status: 'pending', mileage_in: 78500, mileage_out: null, labor_hours: 0, labor_cost: 0, total_price: 0 },
        { vehicle_id: 4, technician_id: 1, status: 'completed', mileage_in: 22300, mileage_out: 22350, labor_hours: 1.5, labor_cost: 1275, total_price: 3420 },
        { vehicle_id: 5, technician_id: 2, status: 'waiting', mileage_in: 89700, mileage_out: null, labor_hours: 0, labor_cost: 0, total_price: 0 },
        { vehicle_id: 6, technician_id: 3, status: 'completed', mileage_in: 56200, mileage_out: 56280, labor_hours: 3, labor_cost: 3000, total_price: 7500 }
      ];

      const jobStmt = db.prepare('INSERT INTO jobs (vehicle_id, technician_id, status, mileage_in, mileage_out, labor_hours, labor_cost, total_price, completion_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
      jobsData.forEach((j, idx) => {
        const completionDate = j.status === 'completed' ? new Date(Date.now() - idx * 86400000).toISOString() : null;
        jobStmt.run(j.vehicle_id, j.technician_id, j.status, j.mileage_in, j.mileage_out, j.labor_hours, j.labor_cost, j.total_price, completionDate);
      });
      jobStmt.finalize();
      console.log('✓ Jobs added');

      // Tasks for jobs
      const tasksData = [
        { job_id: 1, description: 'Change engine oil and filter', is_completed: 1 },
        { job_id: 1, description: 'Replace spark plugs', is_completed: 1 },
        { job_id: 1, description: 'Inspect brakes', is_completed: 1 },
        { job_id: 2, description: 'Battery diagnostic', is_completed: 0 },
        { job_id: 2, description: 'Check charging system', is_completed: 1 },
        { job_id: 3, description: 'Replace coolant', is_completed: 0 },
        { job_id: 3, description: 'Check radiator condition', is_completed: 0 },
        { job_id: 4, description: 'Brake pad replacement', is_completed: 1 },
        { job_id: 4, description: 'Wheel alignment', is_completed: 1 },
        { job_id: 5, description: 'Transmission service', is_completed: 0 },
        { job_id: 6, description: 'Full AC service', is_completed: 1 },
        { job_id: 6, description: 'Replace cabin air filter', is_completed: 1 }
      ];

      const taskStmt = db.prepare('INSERT INTO job_tasks (job_id, description, is_completed) VALUES (?, ?, ?)');
      tasksData.forEach(t => taskStmt.run(t.job_id, t.description, t.is_completed));
      taskStmt.finalize();
      console.log('✓ Tasks added');

      // Job parts
      const jobPartsData = [
        { job_id: 1, part_id: 2, qty: 1, price_at_sale: 550, cost_at_sale: 280 },
        { job_id: 1, part_id: 1, qty: 1, price_at_sale: 850, cost_at_sale: 450 },
        { job_id: 1, part_id: 5, qty: 1, price_at_sale: 2200, cost_at_sale: 1200 },
        { job_id: 2, part_id: 4, qty: 1, price_at_sale: 8500, cost_at_sale: 4500 },
        { job_id: 4, part_id: 5, qty: 2, price_at_sale: 2200, cost_at_sale: 1200 },
        { job_id: 6, part_id: 6, qty: 2, price_at_sale: 750, cost_at_sale: 350 },
        { job_id: 6, part_id: 3, qty: 1, price_at_sale: 650, cost_at_sale: 320 }
      ];

      const jobPartStmt = db.prepare('INSERT INTO job_parts (job_id, part_id, qty, price_at_sale, cost_at_sale) VALUES (?, ?, ?, ?, ?)');
      jobPartsData.forEach(jp => jobPartStmt.run(jp.job_id, jp.part_id, jp.qty, jp.price_at_sale, jp.cost_at_sale));
      jobPartStmt.finalize();
      console.log('✓ Job parts added');

      // Ownership history
      const ownershipData = [
        { vehicle_id: 1, old_owner: 'John Smith', new_owner: 'W.M. Perera', mileage_at_transfer: 42000 },
        { vehicle_id: 2, old_owner: 'Rental Company', new_owner: 'K. Jayawardena', mileage_at_transfer: 28000 },
        { vehicle_id: 3, old_owner: 'Export Vehicle', new_owner: 'R. Silva', mileage_at_transfer: 75000 }
      ];

      const ownershipStmt = db.prepare('INSERT INTO ownership_history (vehicle_id, old_owner, new_owner, mileage_at_transfer) VALUES (?, ?, ?, ?)');
      ownershipData.forEach(o => ownershipStmt.run(o.vehicle_id, o.old_owner, o.new_owner, o.mileage_at_transfer));
      ownershipStmt.finalize();
      console.log('✓ Ownership history added');

      // Labor charges
      const laborData = [
        { job_id: 1, technician_id: 1, hours_worked: 2.5, hourly_rate: 850, total_labor_cost: 2125 },
        { job_id: 4, technician_id: 1, hours_worked: 1.5, hourly_rate: 850, total_labor_cost: 1275 },
        { job_id: 6, technician_id: 3, hours_worked: 3, hourly_rate: 1000, total_labor_cost: 3000 }
      ];

      const laborStmt = db.prepare('INSERT INTO labor_charges (job_id, technician_id, hours_worked, hourly_rate, total_labor_cost) VALUES (?, ?, ?, ?, ?)');
      laborData.forEach(l => laborStmt.run(l.job_id, l.technician_id, l.hours_worked, l.hourly_rate, l.total_labor_cost));
      laborStmt.finalize((err) => {
        if (err) reject(err);
        else {
          console.log('✓ Labor charges added');
          console.log('\n✅ Database successfully seeded with Sri Lankan dummy data!');
          resolve();
        }
      });
    });
  });
};

(async () => {
  try {
    await initSchema();
    console.log('✓ Database schema initialized');
    await clearDB();
    await seedDB();
    db.close();
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
})();
