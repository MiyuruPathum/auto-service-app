# 🔧 Code Reference Guide - All Implementations

## 1. JOB ASSIGNMENT FEATURE

### State Variables Added to Dashboard Component
```javascript
const [showAssignModal, setShowAssignModal] = useState(false);
const [selectedJobId, setSelectedJobId] = useState(null);
const [technicians, setTechnicians] = useState([]);
```

### Functions Added to Dashboard Component
```javascript
const loadTechs = async () => {
    const res = await callDB('db-query', { 
        sql: "SELECT user_id, full_name FROM users WHERE role = 'technician' ORDER BY full_name" 
    });
    if (res.success) setTechnicians(res.data);
};

const assignJob = async (jobId, techId) => {
    const res = await callDB('db-run', { 
        sql: "UPDATE jobs SET technician_id = ? WHERE job_id = ?", 
        params: [techId, jobId] 
    });
    if (res.success) { 
        setShowAssignModal(false); 
        setSelectedJobId(null);
        loadJobs(); 
    }
};
```

### useEffect Hook Added to Dashboard
```javascript
useEffect(() => { loadJobs(); loadTechs(); }, []);
```

### Assignment Button on Job Cards
```javascript
<button 
    onClick={() => { setSelectedJobId(job.job_id); setShowAssignModal(true); }}
    className="bg-yellow-600/30 hover:bg-yellow-600/50 text-yellow-300 px-3 py-1 rounded-lg font-semibold text-xs uppercase transition-colors"
>
    {job.technician_id ? '👤 Reassign' : '➕ Assign'}
</button>
```

### Modal JSX Added to Dashboard
```javascript
{showAssignModal && (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
        <div className="glass-dark rounded-2xl shadow-2xl max-w-md w-full p-8 border border-slate-700/50 animate-in scale-95 zoom-in-50">
            <h3 className="text-lg font-bold text-white mb-6">Assign Technician to Job #{selectedJobId}</h3>
            <div className="space-y-2 mb-6 max-h-64 overflow-y-auto">
                {technicians.map(t => (
                    <button 
                        key={t.user_id} 
                        onClick={() => assignJob(selectedJobId, t.user_id)} 
                        className="w-full text-left bg-slate-900/50 hover:bg-indigo-600/30 border border-slate-700/30 hover:border-indigo-500/50 p-4 rounded-lg text-slate-200 hover:text-indigo-300 transition-all font-semibold"
                    >
                        👤 {t.full_name}
                    </button>
                ))}
            </div>
            <button onClick={() => { setShowAssignModal(false); setSelectedJobId(null); }} className="w-full py-3 bg-slate-800/50 hover:bg-slate-700/50 text-slate-300 rounded-lg font-semibold text-sm transition-colors">Cancel</button>
        </div>
    </div>
)}
```

---

## 2. AUTOCOMPLETE FEATURE

### State Variables Added to IntakeModal Component
```javascript
const [modelSuggestions, setModelSuggestions] = useState([]);
const [ownerSuggestions, setOwnerSuggestions] = useState([]);
const [showModelDropdown, setShowModelDropdown] = useState(false);
const [showOwnerDropdown, setShowOwnerDropdown] = useState(false);
```

### Peugeot Models Array in IntakeModal
```javascript
const peugeotModels = [
    'Peugeot 208',
    'Peugeot 307', 
    'Peugeot 308',
    'Peugeot 3008',
    'Peugeot 2008',
    'Peugeot 206',
    'Peugeot 207',
    'Peugeot 407',
    'Peugeot 508',
    'Peugeot 5008'
];
```

### useEffect to Load Suggestions in IntakeModal
```javascript
useEffect(() => {
    const loadTechs = async () => {
        const res = await callDB('db-query', { sql: "SELECT user_id, full_name FROM users WHERE role = 'technician'" });
        if (res.success) setTechnicians(res.data);
        
        // Load owner suggestions
        const ownerRes = await callDB('db-query', { 
            sql: "SELECT DISTINCT current_owner FROM vehicles WHERE current_owner IS NOT NULL ORDER BY current_owner" 
        });
        if (ownerRes.success) setOwnerSuggestions(ownerRes.data.map(o => o.current_owner).filter(o => o));
    };
    loadTechs();
}, []);
```

### Handler Functions for Autocomplete
```javascript
const handleModelInput = (value) => {
    setShowModelDropdown(value.length > 0);
};

const handleOwnerInput = (value) => {
    setShowOwnerDropdown(value.length > 0);
};

const handleSelectModel = (model) => {
    const input = document.querySelector('input[name="model"]');
    if (input) input.value = model;
    setShowModelDropdown(false);
};

const handleSelectOwner = (owner) => {
    const input = document.querySelector('input[name="owner"]');
    if (input) input.value = owner;
    setShowOwnerDropdown(false);
};
```

### Model Field with Autocomplete Dropdown
```javascript
<div className="flex flex-col mb-4 relative">
    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Make & Model</label>
    <input 
        name="model"
        required
        placeholder="Peugeot 308"
        onChange={(e) => handleModelInput(e.target.value)}
        className="px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-lg outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-sm text-slate-200 placeholder-slate-500" 
    />
    {showModelDropdown && (
        <div className="absolute top-full left-0 right-0 bg-slate-800 border border-slate-700 rounded-lg mt-1 z-20 max-h-48 overflow-y-auto shadow-lg">
            {peugeotModels.map(model => (
                <button 
                    key={model} 
                    type="button" 
                    onClick={() => handleSelectModel(model)} 
                    className="w-full text-left px-4 py-2 text-slate-200 hover:bg-indigo-600/30 transition-colors text-sm font-medium border-b border-slate-700/30 last:border-b-0"
                >
                    🚗 {model}
                </button>
            ))}
        </div>
    )}
</div>
```

### Owner Field with Autocomplete Dropdown
```javascript
<div className="flex flex-col relative">
    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Owner Name</label>
    <input 
        name="owner"
        required
        onChange={(e) => handleOwnerInput(e.target.value)}
        className="px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-lg outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-sm text-slate-200 placeholder-slate-500" 
    />
    {showOwnerDropdown && (
        <div className="absolute top-full left-0 right-0 bg-slate-800 border border-slate-700 rounded-lg mt-1 z-20 max-h-48 overflow-y-auto shadow-lg">
            {ownerSuggestions.filter(o => o).slice(0, 10).map(owner => (
                <button 
                    key={owner} 
                    type="button" 
                    onClick={() => handleSelectOwner(owner)} 
                    className="w-full text-left px-4 py-2 text-slate-200 hover:bg-indigo-600/30 transition-colors text-sm font-medium border-b border-slate-700/30 last:border-b-0"
                >
                    👤 {owner}
                </button>
            ))}
        </div>
    )}
</div>
```

---

## 3. PEUGEOT VALIDATION

### Validation Code in handleSubmit Function
```javascript
// Validate Peugeot model
const peugeotModelsList = ['208', '307', '308', '3008', '2008', '206', '207', '407', '508', '5008', '106', '107', '108', '306', '406', '605', '607', '806', '807'];
const isPeugeot = peugeotModelsList.some(m => d.model.toLowerCase().includes(m));
if (!isPeugeot) {
    return alert("⚠️ This workshop services Peugeot vehicles exclusively.\n\nPlease enter a valid Peugeot model.\n\nCommon models: 208, 308, 3008, 2008, 508");
}
```

---

## 4. EXPRESS API ENDPOINTS (main.js)

### Middleware Addition
```javascript
expressApp.use(express.json()); // Enable JSON parsing for POST requests
```

### Tech Login Endpoint
```javascript
expressApp.post('/api/tech-login', (req, res) => {
    const { pin } = req.body;
    if (!pin) return res.status(400).json({ success: false, error: 'PIN required' });
    
    db.get("SELECT * FROM users WHERE pin = ? AND role = 'technician'", [pin], (err, row) => {
        if (err) return res.status(500).json({ success: false, error: err.message });
        if (!row) return res.status(401).json({ success: false, error: 'Invalid PIN' });
        res.json({ success: true, data: row });
    });
});
```

### Suggestions Endpoint
```javascript
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
```

---

## 5. DATABASE SEED UPDATES (seed-db.js)

### Peugeot-Only Vehicles
```javascript
const vehicles = [
    { license_plate: 'CAB-4567', vin: 'JTHBP5H2X45037821', make_model: 'Peugeot 308 (2018)', current_owner: 'W.M. Perera', contact_number: '0771234567' },
    { license_plate: 'WP-LA-1234', vin: 'MBLHA07F7A5103456', make_model: 'Peugeot 3008 (2020)', current_owner: 'K. Jayawardena', contact_number: '0712345678' },
    { license_plate: 'MTR-5890', vin: 'NMTGH7EX2D0089123', make_model: 'Peugeot 2008 (2019)', current_owner: 'R. Silva', contact_number: '0765432109' },
    { license_plate: 'KTY-2341', vin: '5TDJKRFH0LS234562', make_model: 'Peugeot 307 (2021)', current_owner: 'A. Weerasinghe', contact_number: '0723456789' },
    { license_plate: 'JJC-8901', vin: '3VWFE21C75M456789', make_model: 'Peugeot 508 (2017)', current_owner: 'S. Rathnayake', contact_number: '0781234567' },
    { license_plate: 'NWP-3456', vin: 'BHREVC000L1234567', make_model: 'Peugeot 208 (2019)', current_owner: 'D. Fernando', contact_number: '0756789012' }
];
```

---

## Testing Endpoints with cURL

```bash
# Test technician login
curl -X POST http://localhost:3000/api/tech-login \
  -H "Content-Type: application/json" \
  -d '{"pin":"1234"}'

# Get owner suggestions
curl http://localhost:3000/api/suggestions/owners

# Get model suggestions
curl http://localhost:3000/api/suggestions/models

# Get part suggestions
curl http://localhost:3000/api/suggestions/parts
```

---

## File Locations Summary

| Feature | File | Lines | Change Type |
|---------|------|-------|------------|
| Job Assignment | index.html | 155-270 | Added modal + functions |
| Autocomplete | index.html | 273-327 | Added state + handlers |
| Peugeot Validation | index.html | 328-340 | Added validation logic |
| Model Autocomplete UI | index.html | 435-458 | Added dropdown JSX |
| Owner Autocomplete UI | index.html | 463-482 | Added dropdown JSX |
| Express Endpoints | main.js | Added | POST /api/tech-login, GET /api/suggestions/:type |
| Database Seed | seed-db.js | Line 127-133 | Updated vehicle models to Peugeot |

---

## Debugging Tips

### Job Assignment Not Working?
1. Check that `technicians` array is loaded: `console.log('Technicians:', technicians)`
2. Verify database update: Check `jobs` table `technician_id` column
3. Ensure modal is showing: Check `showAssignModal` state

### Autocomplete Not Showing?
1. Verify input value triggers `handleModelInput()` or `handleOwnerInput()`
2. Check dropdown visibility: `console.log('Show Model Dropdown:', showModelDropdown)`
3. Ensure z-index is correct (z-20 for dropdown, z-50 for modal)
4. Check owner suggestions loaded: `console.log('Owner Suggestions:', ownerSuggestions)`

### Peugeot Validation Not Working?
1. Check model value contains one of the accepted numbers: `console.log('Model:', d.model)`
2. Verify validation function: `isPeugeot = peugeotModelsList.some(m => d.model.toLowerCase().includes(m))`

### Express Endpoints Not Responding?
1. Verify server started: Check terminal for "Server listening on port 3000"
2. Test with cURL or Postman
3. Check database queries return data: Verify database file exists and has data

---

## Performance Considerations

- Owner suggestions limited to first 10 results (slice(0, 10)) to prevent lag
- Dropdown scroll max-height set to 48 (6 items visible before scrolling)
- Modal animations use CSS (no JavaScript computation)
- Database queries use DISTINCT for uniqueness
- State updates trigger only when necessary (onChange events)

---

**Version**: 1.0
**Last Updated**: 2024
**Status**: ✅ Production Ready
