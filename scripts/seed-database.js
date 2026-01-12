const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = path.join(process.cwd(), 'workshop.db');
const uploadsPath = path.join(process.cwd(), 'uploads');

// Clear uploads folder
if (fs.existsSync(uploadsPath)) {
    fs.readdirSync(uploadsPath).forEach(file => {
        fs.unlinkSync(path.join(uploadsPath, file));
    });
    console.log('✓ Uploads folder cleared');
}

const db = new sqlite3.Database(dbPath);

// Helper to run queries with promises
const run = (sql, params = []) => new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
        if (err) reject(err);
        else resolve(this);
    });
});

const all = (sql, params = []) => new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
    });
});

async function seedDatabase() {
    console.log('🔄 Starting database seed...\n');

    // Clear existing data (order matters for foreign keys)
    await run('DELETE FROM job_parts');
    await run('DELETE FROM job_tasks');
    await run('DELETE FROM labor_charges');
    await run('DELETE FROM jobs');
    await run('DELETE FROM ownership_history');
    await run('DELETE FROM inventory');
    await run('DELETE FROM vehicles');
    await run('DELETE FROM users');
    console.log('✓ Existing data cleared\n');

    // ============================================
    // USERS (Technicians)
    // Schema: user_id, full_name, role, pin, hourly_rate
    // ============================================
    const technicians = [
        { name: 'Marcus Thompson', pin: '1234', role: 'technician', rate: 45.00 },
        { name: 'David Chen', pin: '5678', role: 'technician', rate: 42.00 },
        { name: 'James Wilson', pin: '9012', role: 'technician', rate: 40.00 },
        { name: 'Ahmed Hassan', pin: '3456', role: 'technician', rate: 38.00 }
    ];

    const techIds = {};
    for (const tech of technicians) {
        const result = await run('INSERT INTO users (full_name, pin, role, hourly_rate) VALUES (?, ?, ?, ?)', 
            [tech.name, tech.pin, tech.role, tech.rate]);
        techIds[tech.name] = result.lastID;
    }
    console.log(`✓ Added ${technicians.length} technicians`);

    // ============================================
    // INVENTORY (Peugeot Parts)
    // Schema: part_id, part_name, part_number, total_quantity, avg_cost, retail_price, min_threshold, category, condition, photo_path
    // ============================================
    const inventory = [
        // Oil Filters
        { name: 'Oil Filter - 1.2 PureTech', num: 'PEU-OF-1007', qty: 25, cost: 8.50, price: 18.99, min: 10, cat: 'Filters' },
        { name: 'Oil Filter - 1.5/1.6 BlueHDi', num: 'PEU-OF-1008', qty: 18, cost: 9.20, price: 21.99, min: 8, cat: 'Filters' },
        { name: 'Oil Filter - 2.0 BlueHDi', num: 'PEU-OF-1009', qty: 12, cost: 11.00, price: 24.99, min: 5, cat: 'Filters' },
        
        // Air Filters
        { name: 'Air Filter - 208/2008', num: 'PEU-AF-2001', qty: 15, cost: 12.00, price: 28.99, min: 5, cat: 'Filters' },
        { name: 'Air Filter - 308/3008/5008', num: 'PEU-AF-2002', qty: 20, cost: 14.50, price: 32.99, min: 8, cat: 'Filters' },
        { name: 'Air Filter - 508', num: 'PEU-AF-2003', qty: 8, cost: 16.00, price: 36.99, min: 4, cat: 'Filters' },
        
        // Cabin/Pollen Filters
        { name: 'Cabin Filter - Standard', num: 'PEU-CF-3001', qty: 22, cost: 8.00, price: 19.99, min: 10, cat: 'Filters' },
        { name: 'Cabin Filter - Activated Carbon', num: 'PEU-CF-3002', qty: 14, cost: 15.00, price: 34.99, min: 6, cat: 'Filters' },
        
        // Brake Pads
        { name: 'Front Brake Pads - 208/2008', num: 'PEU-BP-4001', qty: 8, cost: 35.00, price: 79.99, min: 4, cat: 'Brakes' },
        { name: 'Front Brake Pads - 308/3008', num: 'PEU-BP-4002', qty: 10, cost: 42.00, price: 89.99, min: 4, cat: 'Brakes' },
        { name: 'Rear Brake Pads - Universal', num: 'PEU-BP-4003', qty: 12, cost: 28.00, price: 64.99, min: 6, cat: 'Brakes' },
        { name: 'Front Brake Pads - 508/5008', num: 'PEU-BP-4004', qty: 6, cost: 55.00, price: 119.99, min: 3, cat: 'Brakes' },
        
        // Brake Discs
        { name: 'Front Brake Discs - 208/2008 (pair)', num: 'PEU-BD-4101', qty: 4, cost: 65.00, price: 139.99, min: 2, cat: 'Brakes' },
        { name: 'Front Brake Discs - 308/3008 (pair)', num: 'PEU-BD-4102', qty: 6, cost: 85.00, price: 179.99, min: 2, cat: 'Brakes' },
        { name: 'Rear Brake Discs - Universal (pair)', num: 'PEU-BD-4103', qty: 4, cost: 55.00, price: 124.99, min: 2, cat: 'Brakes' },
        
        // Engine Oil
        { name: 'Total Quartz 9000 5W-40 (5L)', num: 'PEU-OIL-5001', qty: 30, cost: 28.00, price: 54.99, min: 15, cat: 'Oils & Fluids' },
        { name: 'Total Quartz Ineo 5W-30 (5L)', num: 'PEU-OIL-5002', qty: 25, cost: 32.00, price: 62.99, min: 12, cat: 'Oils & Fluids' },
        { name: 'Total Quartz 9000 0W-30 (5L)', num: 'PEU-OIL-5003', qty: 20, cost: 38.00, price: 72.99, min: 10, cat: 'Oils & Fluids' },
        
        // Spark Plugs
        { name: 'Spark Plug - PureTech (set of 3)', num: 'PEU-SP-6001', qty: 15, cost: 24.00, price: 54.99, min: 6, cat: 'Engine' },
        { name: 'Spark Plug - THP (set of 4)', num: 'PEU-SP-6002', qty: 8, cost: 32.00, price: 69.99, min: 4, cat: 'Engine' },
        
        // Timing Belts & Kits
        { name: 'Timing Belt Kit - 1.2 PureTech', num: 'PEU-TB-7001', qty: 5, cost: 145.00, price: 289.99, min: 2, cat: 'Engine' },
        { name: 'Timing Belt Kit - 1.5/1.6 BlueHDi', num: 'PEU-TB-7002', qty: 4, cost: 185.00, price: 359.99, min: 2, cat: 'Engine' },
        { name: 'Timing Belt Kit - 2.0 BlueHDi', num: 'PEU-TB-7003', qty: 3, cost: 210.00, price: 399.99, min: 2, cat: 'Engine' },
        
        // Batteries
        { name: 'Battery 60Ah - Standard', num: 'PEU-BAT-8001', qty: 6, cost: 75.00, price: 149.99, min: 3, cat: 'Electrical' },
        { name: 'Battery 70Ah - Diesel/Stop-Start', num: 'PEU-BAT-8002', qty: 5, cost: 95.00, price: 189.99, min: 2, cat: 'Electrical' },
        { name: 'Battery 80Ah - Premium AGM', num: 'PEU-BAT-8003', qty: 3, cost: 145.00, price: 279.99, min: 2, cat: 'Electrical' },
        
        // Coolant & Fluids
        { name: 'Coolant Concentrate (5L)', num: 'PEU-COOL-9001', qty: 15, cost: 18.00, price: 39.99, min: 8, cat: 'Oils & Fluids' },
        { name: 'Brake Fluid DOT 4 (1L)', num: 'PEU-BF-9002', qty: 20, cost: 8.00, price: 18.99, min: 10, cat: 'Oils & Fluids' },
        { name: 'Automatic Transmission Fluid (1L)', num: 'PEU-ATF-9003', qty: 10, cost: 22.00, price: 44.99, min: 5, cat: 'Oils & Fluids' },
        
        // Wipers
        { name: 'Wiper Blade Set - 208', num: 'PEU-WB-1101', qty: 10, cost: 18.00, price: 39.99, min: 5, cat: 'Body' },
        { name: 'Wiper Blade Set - 308/3008', num: 'PEU-WB-1102', qty: 12, cost: 22.00, price: 47.99, min: 5, cat: 'Body' },
        
        // Suspension
        { name: 'Front Shock Absorber - 208/2008', num: 'PEU-SS-1201', qty: 4, cost: 85.00, price: 179.99, min: 2, cat: 'Suspension' },
        { name: 'Front Shock Absorber - 308/3008', num: 'PEU-SS-1202', qty: 4, cost: 110.00, price: 229.99, min: 2, cat: 'Suspension' },
        { name: 'Rear Shock Absorber - Universal', num: 'PEU-SS-1203', qty: 6, cost: 65.00, price: 139.99, min: 2, cat: 'Suspension' },
        
        // Clutch
        { name: 'Clutch Kit - 1.2 PureTech', num: 'PEU-CLU-1301', qty: 2, cost: 320.00, price: 599.99, min: 1, cat: 'Transmission' },
        { name: 'Clutch Kit - 1.5/1.6 BlueHDi', num: 'PEU-CLU-1302', qty: 2, cost: 380.00, price: 699.99, min: 1, cat: 'Transmission' },
        
        // Lights
        { name: 'Headlight Bulb H7 (pair)', num: 'PEU-LT-1401', qty: 20, cost: 8.00, price: 19.99, min: 10, cat: 'Electrical' },
        { name: 'Headlight Bulb H7 LED Upgrade', num: 'PEU-LT-1402', qty: 8, cost: 45.00, price: 94.99, min: 4, cat: 'Electrical' }
    ];

    const partIds = {};
    for (const item of inventory) {
        const result = await run(`INSERT INTO inventory (part_name, part_number, total_quantity, avg_cost, retail_price, min_threshold, category, condition) 
            VALUES (?, ?, ?, ?, ?, ?, ?, 'new')`,
            [item.name, item.num, item.qty, item.cost, item.price, item.min, item.cat]);
        partIds[item.num] = { id: result.lastID, cost: item.cost, price: item.price };
    }
    console.log(`✓ Added ${inventory.length} inventory items`);

    // ============================================
    // VEHICLES (Peugeot only)
    // Schema: vehicle_id, license_plate, vin, make_model, current_owner, contact_number, photo_path, is_archived
    // ============================================
    const vehicles = [
        { plate: 'MN21 XYZ', vin: 'VF3CCHMZ6GT123456', model: 'Peugeot 308 (2021) Pearl White', owner: 'Robert Mitchell', phone: '07412 345678' },
        { plate: 'LK20 ABC', vin: 'VF3MCBHZ8KT234567', model: 'Peugeot 3008 (2020) Nera Black', owner: 'Sarah Johnson', phone: '07523 456789' },
        { plate: 'PO22 DEF', vin: 'VF3LBHZ9JT345678', model: 'Peugeot 208 (2022) Elixir Red', owner: 'Michael O\'Brien', phone: '07634 567890' },
        { plate: 'WR19 GHI', vin: 'VF3NCBHZ2LT456789', model: 'Peugeot 5008 (2019) Amazonite Grey', owner: 'Emma Williams', phone: '07745 678901' },
        { plate: 'BT23 JKL', vin: 'VF3DCBHZ4MT567890', model: 'Peugeot 508 PHEV (2023) Celebes Blue', owner: 'Thomas Anderson', phone: '07856 789012' },
        { plate: 'HY18 MNO', vin: 'VF3ACBHZ6NT678901', model: 'Peugeot 2008 (2018) Bianca White', owner: 'Lisa Brown', phone: '07967 890123' },
        { plate: 'KL21 PQR', vin: 'VF3BCBHZ8PT789012', model: 'Peugeot 308 SW (2021) Perla Nera Black', owner: 'Daniel Taylor', phone: '07123 901234' },
        { plate: 'YU20 STU', vin: 'VF3ECBHZ0RT890123', model: 'Peugeot 3008 GT (2020) Ultimate Red', owner: 'Catherine Davies', phone: '07234 012345' },
        { plate: 'NM22 VWX', vin: 'VF3FCBHZ2ST901234', model: 'Peugeot 208 GT (2022) Vertigo Blue', owner: 'Steven Clarke', phone: '07345 123456' },
        { plate: 'DF17 YZA', vin: 'VF3GCBHZ4TT012345', model: 'Peugeot Partner (2017) White', owner: 'Jennifer White', phone: '07456 234567' },
        // Vehicles with ownership transfers
        { plate: 'GH19 BCD', vin: 'VF3HCBHZ6UT123456', model: 'Peugeot 308 (2019) Hurricane Grey', owner: 'Mark Robinson', phone: '07567 345678' },
        { plate: 'JK20 EFG', vin: 'VF3ICBHZ8VT234567', model: 'Peugeot 2008 (2020) Orange Fusion', owner: 'Rachel Green', phone: '07678 456789' }
    ];

    const vehicleIds = {};
    for (const v of vehicles) {
        const result = await run(`INSERT INTO vehicles (license_plate, vin, make_model, current_owner, contact_number) 
            VALUES (?, ?, ?, ?, ?)`,
            [v.plate, v.vin, v.model, v.owner, v.phone]);
        vehicleIds[v.plate] = result.lastID;
    }
    console.log(`✓ Added ${vehicles.length} vehicles`);

    // ============================================
    // OWNERSHIP HISTORY (with transfers)
    // Schema: history_id, vehicle_id, old_owner, new_owner, mileage_at_transfer, transfer_date
    // ============================================
    
    // Transfer 1: GH19 BCD (308) was Lisa Brown's, now Mark Robinson's
    await run(`INSERT INTO ownership_history (vehicle_id, old_owner, new_owner, mileage_at_transfer, transfer_date) 
        VALUES (?, ?, ?, ?, ?)`,
        [vehicleIds['GH19 BCD'], 'Lisa Brown (07967 890123)', 'Mark Robinson (07567 345678)', 67500, '2024-03-15']);

    // Transfer 2: JK20 EFG (2008) was Thomas Anderson's, now Rachel Green's  
    await run(`INSERT INTO ownership_history (vehicle_id, old_owner, new_owner, mileage_at_transfer, transfer_date) 
        VALUES (?, ?, ?, ?, ?)`,
        [vehicleIds['JK20 EFG'], 'Thomas Anderson (07856 789012)', 'Rachel Green (07678 456789)', 35200, '2023-11-28']);

    console.log('✓ Added 2 ownership transfers');

    // ============================================
    // JOBS (Mix of Completed and In Progress)
    // Schema: job_id, vehicle_id, technician_id, status, mileage_in, mileage_out, labor_hours, labor_cost, taxi_cost, total_price, owner_name, owner_phone, completion_date, created_at
    // ============================================
    
    // Track inventory usage
    const inventoryUsed = {};
    const useInventory = (partNum, qty) => {
        if (!inventoryUsed[partNum]) inventoryUsed[partNum] = 0;
        inventoryUsed[partNum] += qty;
        return partIds[partNum];
    };

    const jobs = [
        // ============ COMPLETED JOBS ============
        {
            plate: 'MN21 XYZ',
            status: 'completed',
            tech: 'Marcus Thompson',
            mileageIn: 34200,
            mileageOut: 34215,
            laborHours: 2.5,
            laborCost: 112.50,
            taxiCost: 0,
            dateIn: '2025-12-28',
            dateOut: '2025-12-28',
            tasks: [
                { desc: 'Full Service - 35,000 mile service', done: true },
                { desc: 'Oil and filter change', done: true },
                { desc: 'Air filter replacement', done: true },
                { desc: 'Cabin filter replacement', done: true },
                { desc: 'Wheel balance - resolved vibration at 70mph', done: true }
            ],
            parts: [
                { num: 'PEU-OF-1007', qty: 1 },
                { num: 'PEU-AF-2002', qty: 1 },
                { num: 'PEU-CF-3001', qty: 1 },
                { num: 'PEU-OIL-5003', qty: 1 }
            ]
        },
        {
            plate: 'LK20 ABC',
            status: 'completed',
            tech: 'David Chen',
            mileageIn: 52100,
            mileageOut: 52120,
            laborHours: 2.0,
            laborCost: 84.00,
            taxiCost: 15.00,
            dateIn: '2025-12-20',
            dateOut: '2025-12-21',
            tasks: [
                { desc: 'Brake inspection - front pads worn to 2mm', done: true },
                { desc: 'Replace front brake pads', done: true },
                { desc: 'Clean caliper slides', done: true },
                { desc: 'Brake fluid top up', done: true },
                { desc: 'Test drive - noise resolved', done: true }
            ],
            parts: [
                { num: 'PEU-BP-4002', qty: 1 },
                { num: 'PEU-BF-9002', qty: 1 }
            ]
        },
        {
            plate: 'WR19 GHI',
            status: 'completed',
            tech: 'James Wilson',
            mileageIn: 78200,
            mileageOut: 78210,
            laborHours: 8.0,
            laborCost: 320.00,
            taxiCost: 25.00,
            dateIn: '2025-12-10',
            dateOut: '2025-12-12',
            tasks: [
                { desc: 'Timing belt replacement - due at 80k', done: true },
                { desc: 'Water pump replacement (included in kit)', done: true },
                { desc: 'Tensioner replacement', done: true },
                { desc: 'Coolant drain and refill', done: true },
                { desc: 'Check auxiliary belts - OK', done: true },
                { desc: '24hr leak check - no leaks', done: true }
            ],
            parts: [
                { num: 'PEU-TB-7003', qty: 1 },
                { num: 'PEU-COOL-9001', qty: 2 }
            ]
        },
        {
            plate: 'HY18 MNO',
            status: 'completed',
            tech: 'Ahmed Hassan',
            mileageIn: 89400,
            mileageOut: 89405,
            laborHours: 1.0,
            laborCost: 38.00,
            taxiCost: 0,
            dateIn: '2025-12-05',
            dateOut: '2025-12-05',
            tasks: [
                { desc: 'Diagnose no-start condition', done: true },
                { desc: 'Battery test - 9.2V, failed load test', done: true },
                { desc: 'Replace battery', done: true },
                { desc: 'Full diagnostic scan - no faults', done: true },
                { desc: 'Reset ECU adaptations', done: true },
                { desc: 'Test stop-start function - OK', done: true }
            ],
            parts: [
                { num: 'PEU-BAT-8002', qty: 1 }
            ]
        },
        {
            plate: 'KL21 PQR',
            status: 'completed',
            tech: 'Marcus Thompson',
            mileageIn: 40800,
            mileageOut: 40850,
            laborHours: 4.0,
            laborCost: 180.00,
            taxiCost: 0,
            dateIn: '2025-11-28',
            dateOut: '2025-11-29',
            tasks: [
                { desc: 'DPF warning light diagnosis', done: true },
                { desc: 'Diagnostics - DPF 95% blocked', done: true },
                { desc: 'Forced regeneration cycle', done: true },
                { desc: 'Oil change - contaminated with diesel', done: true },
                { desc: 'Air filter replacement', done: true },
                { desc: 'Advise customer on DPF driving habits', done: true }
            ],
            parts: [
                { num: 'PEU-OF-1008', qty: 1 },
                { num: 'PEU-OIL-5002', qty: 1 },
                { num: 'PEU-AF-2002', qty: 1 }
            ]
        },
        {
            plate: 'GH19 BCD',
            status: 'completed',
            tech: 'David Chen',
            mileageIn: 67500,
            mileageOut: 67510,
            laborHours: 1.5,
            laborCost: 63.00,
            taxiCost: 0,
            dateIn: '2024-03-14',
            dateOut: '2024-03-14',
            ownerName: 'Lisa Brown',  // Historical owner before transfer
            ownerPhone: '07967 890123',
            tasks: [
                { desc: 'Pre-purchase inspection for buyer', done: true },
                { desc: 'Visual inspection - bodywork OK', done: true },
                { desc: 'Check all fluids - OK', done: true },
                { desc: 'Brake check - 60% remaining', done: true },
                { desc: 'Note: Front suspension bushes showing wear', done: true },
                { desc: 'Diagnostic scan - no warning lights', done: true }
            ],
            parts: []
        },

        // ============ IN PROGRESS JOBS ============
        {
            plate: 'PO22 DEF',
            status: 'in_progress',
            tech: 'Marcus Thompson',
            mileageIn: 18200,
            mileageOut: null,
            laborHours: 1.5,
            laborCost: 67.50,
            taxiCost: 0,
            dateIn: '2026-01-11',
            dateOut: null,
            tasks: [
                { desc: 'Annual service', done: false },
                { desc: 'Oil and filter change', done: true },
                { desc: 'Air filter replacement', done: true },
                { desc: 'Cabin filter replacement', done: true },
                { desc: 'Brake inspection - front pads 4mm, discuss with customer', done: false },
                { desc: 'General inspection', done: false }
            ],
            parts: [
                { num: 'PEU-OF-1007', qty: 1 },
                { num: 'PEU-AF-2001', qty: 1 },
                { num: 'PEU-CF-3002', qty: 1 },
                { num: 'PEU-OIL-5003', qty: 1 }
            ]
        },
        {
            plate: 'YU20 STU',
            status: 'in_progress',
            tech: 'James Wilson',
            mileageIn: 56800,
            mileageOut: null,
            laborHours: 2.0,
            laborCost: 80.00,
            taxiCost: 0,
            dateIn: '2026-01-10',
            dateOut: null,
            tasks: [
                { desc: 'Investigate knocking noise front left', done: true },
                { desc: 'Found worn drop link - needs replacement', done: true },
                { desc: 'Shock absorber leaking - awaiting approval', done: false },
                { desc: 'Waiting for customer decision on additional work', done: false }
            ],
            parts: [
                { num: 'PEU-SS-1202', qty: 1 }
            ]
        },
        {
            plate: 'BT23 JKL',
            status: 'in_progress',
            tech: 'Ahmed Hassan',
            mileageIn: 8900,
            mileageOut: null,
            laborHours: 2.5,
            laborCost: 95.00,
            taxiCost: 0,
            dateIn: '2026-01-12',
            dateOut: null,
            tasks: [
                { desc: 'First service at 9000 miles', done: false },
                { desc: 'Oil and filter change', done: true },
                { desc: 'Cabin filter replacement', done: true },
                { desc: 'Running manufacturer software updates', done: false },
                { desc: 'Hybrid system check', done: false }
            ],
            parts: [
                { num: 'PEU-OF-1007', qty: 1 },
                { num: 'PEU-CF-3002', qty: 1 },
                { num: 'PEU-OIL-5001', qty: 1 }
            ]
        },
        {
            plate: 'DF17 YZA',
            status: 'in_progress',
            tech: 'David Chen',
            mileageIn: 124500,
            mileageOut: null,
            laborHours: 6.0,
            laborCost: 252.00,
            taxiCost: 35.00,
            dateIn: '2026-01-09',
            dateOut: null,
            tasks: [
                { desc: 'Clutch slipping - especially higher gears', done: false },
                { desc: 'Gearbox removed', done: true },
                { desc: 'Clutch inspection - worn', done: true },
                { desc: 'DMF showing wear - need complete kit', done: true },
                { desc: 'Awaiting parts delivery (expected tomorrow)', done: false }
            ],
            parts: [
                { num: 'PEU-CLU-1302', qty: 1 }
            ]
        },
        {
            plate: 'NM22 VWX',
            status: 'in_progress',
            tech: 'Marcus Thompson',
            mileageIn: 15600,
            mileageOut: null,
            laborHours: 1.5,
            laborCost: 67.50,
            taxiCost: 0,
            dateIn: '2026-01-11',
            dateOut: null,
            tasks: [
                { desc: 'Engine management light on', done: false },
                { desc: 'Diagnostic scan - P0420 catalyst efficiency', done: true },
                { desc: 'Check O2 sensors', done: false },
                { desc: 'Inspect exhaust system', done: false },
                { desc: 'May need catalyst replacement - quoted customer', done: false }
            ],
            parts: []
        },

        // ============ AWAITING PARTS ============
        {
            plate: 'JK20 EFG',
            status: 'pending',  // Using pending as "awaiting parts"
            tech: 'Ahmed Hassan',
            mileageIn: 38900,
            mileageOut: null,
            laborHours: 0,
            laborCost: 0,
            taxiCost: 20.00,
            dateIn: '2026-01-08',
            dateOut: null,
            tasks: [
                { desc: 'Brakes grinding noise', done: false },
                { desc: 'Front discs below minimum thickness', done: true },
                { desc: 'Front pads also worn', done: true },
                { desc: 'Parts ordered - expected 14th January', done: false },
                { desc: 'Awaiting parts delivery', done: false }
            ],
            parts: [
                { num: 'PEU-BD-4101', qty: 1 },
                { num: 'PEU-BP-4001', qty: 1 }
            ]
        }
    ];

    // Insert jobs, tasks, and parts
    for (const job of jobs) {
        // Calculate parts total
        let partsTotal = 0;
        for (const p of job.parts) {
            partsTotal += partIds[p.num].price * p.qty;
        }
        const totalPrice = job.laborCost + job.taxiCost + partsTotal;

        const result = await run(`INSERT INTO jobs (vehicle_id, technician_id, status, mileage_in, mileage_out, labor_hours, labor_cost, taxi_cost, total_price, owner_name, owner_phone, completion_date, created_at) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [vehicleIds[job.plate], techIds[job.tech], job.status, job.mileageIn, job.mileageOut, 
             job.laborHours, job.laborCost, job.taxiCost, totalPrice,
             job.ownerName || null, job.ownerPhone || null,
             job.dateOut, job.dateIn]);
        
        const jobId = result.lastID;
        
        // Insert tasks
        for (const task of job.tasks) {
            await run('INSERT INTO job_tasks (job_id, description, is_completed) VALUES (?, ?, ?)',
                [jobId, task.desc, task.done ? 1 : 0]);
        }
        
        // Insert parts and track inventory usage
        for (const part of job.parts) {
            const inv = useInventory(part.num, part.qty);
            await run('INSERT INTO job_parts (job_id, part_id, qty, price_at_sale, cost_at_sale) VALUES (?, ?, ?, ?, ?)',
                [jobId, inv.id, part.qty, inv.price, inv.cost]);
        }
    }
    console.log(`✓ Added ${jobs.length} jobs with tasks and parts`);
    console.log(`  - Completed: ${jobs.filter(j => j.status === 'completed').length}`);
    console.log(`  - In Progress: ${jobs.filter(j => j.status === 'in_progress').length}`);
    console.log(`  - Pending/Awaiting Parts: ${jobs.filter(j => j.status === 'pending').length}`);

    // ============================================
    // UPDATE INVENTORY QUANTITIES
    // ============================================
    for (const [partNum, qtyUsed] of Object.entries(inventoryUsed)) {
        await run('UPDATE inventory SET total_quantity = total_quantity - ? WHERE part_number = ?', [qtyUsed, partNum]);
    }
    console.log(`✓ Updated inventory quantities for ${Object.keys(inventoryUsed).length} parts used`);

    // ============================================
    // SUMMARY
    // ============================================
    console.log('\n========================================');
    console.log('        DATABASE SEED COMPLETE');
    console.log('========================================');
    
    const finalInventory = await all('SELECT SUM(total_quantity) as total FROM inventory');
    const totalParts = await all('SELECT COUNT(*) as count FROM inventory');
    const jobCount = await all('SELECT status, COUNT(*) as count FROM jobs GROUP BY status');
    
    console.log(`\nSummary:`);
    console.log(`  • Technicians: ${technicians.length}`);
    console.log(`  • Vehicles: ${vehicles.length} (2 with ownership transfers)`);
    console.log(`  • Inventory: ${totalParts[0].count} part types (${finalInventory[0].total} units in stock)`);
    console.log(`  • Jobs:`);
    jobCount.forEach(j => console.log(`      - ${j.status}: ${j.count}`));
    console.log(`\n✅ Ready to use!`);
    console.log(`\nTechnician PINs:`);
    technicians.forEach(t => console.log(`  • ${t.name}: ${t.pin}`));
    console.log('');

    db.close();
}

seedDatabase().catch(err => {
    console.error('Error seeding database:', err);
    db.close();
    process.exit(1);
});
