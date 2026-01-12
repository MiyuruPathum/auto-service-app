const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'src', 'db', 'workshop.db');
const db = new sqlite3.Database(dbPath);

db.all("SELECT name FROM sqlite_master WHERE type='table'", [], (err, tables) => {
    if (err) {
        console.error('Error:', err);
        db.close();
        return;
    }
    
    console.log('Tables in database:', tables.map(t => t.name).join(', '));
    
    db.all("SELECT user_id, full_name, pin, role FROM users", [], (err, rows) => {
        if (err) {
            console.error('Error querying users:', err.message);
        } else if (rows && rows.length > 0) {
            console.log('\n=== TECHNICIAN PIN CODES ===\n');
            rows.filter(r => r.role === 'technician').forEach(r => {
                console.log(`  ${r.full_name}: PIN ${r.pin}`);
            });
            console.log('');
        } else {
            console.log('No users found in database.');
        }
        db.close();
    });
});
