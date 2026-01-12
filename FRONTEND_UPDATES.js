/* FRONTEND ENHANCEMENT CODE - TO BE INTEGRATED INTO index.html */

// ===== 1. UPDATE DASHBOARD COMPONENT ===== 
// Replace the entire Dashboard component with this enhanced version:

const Dashboard = ({ onOpenJob }) => {
    const [jobs, setJobs] = useState([]);
    const [showIntake, setShowIntake] = useState(false);
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [selectedJobId, setSelectedJobId] = useState(null);
    const [technicians, setTechnicians] = useState([]);

    const loadJobs = async () => {
        const res = await callDB('db-query', { 
            sql: "SELECT j.*, v.license_plate, v.make_model FROM jobs j JOIN vehicles v ON j.vehicle_id = v.vehicle_id WHERE j.status != 'completed' ORDER BY j.created_at DESC" 
        });
        if (res.success) setJobs(res.data);
    };

    const loadTechs = async () => {
        const res = await callDB('db-query', { sql: "SELECT user_id, full_name FROM users WHERE role = 'technician'" });
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

    useEffect(() => { loadJobs(); loadTechs(); }, []);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-white">Active Jobs</h2>
                <button onClick={() => setShowIntake(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg font-semibold shadow-lg shadow-indigo-500/20 active:scale-95 transition-all">
                    ➕ New Vehicle
                </button>
            </div>

            <div className="space-y-3">
                {jobs.map(j => (
                    <div key={j.job_id} className="w-full bg-slate-800/30 hover:bg-slate-700/30 p-6 rounded-xl border border-slate-700/50 flex justify-between items-center transition-all group text-left">
                        <button onClick={() => onOpenJob(j.job_id)} className="flex-1 text-left">
                            <p className="text-xl font-bold text-white group-hover:text-indigo-400 transition-colors">{j.license_plate}</p>
                            <p className="text-slate-400 text-sm">{j.make_model}</p>
                        </button>
                        <div className="flex flex-col items-end gap-2">
                            <span className="bg-indigo-600/30 text-indigo-300 px-4 py-2 rounded-lg font-semibold text-xs uppercase">{j.status}</span>
                            <p className="text-xs text-slate-500">JOB #{j.job_id}</p>
                            <button onClick={() => { setSelectedJobId(j.job_id); setShowAssignModal(true); }} className="bg-yellow-600/30 hover:bg-yellow-600/50 text-yellow-300 px-3 py-1 rounded-lg font-semibold text-xs uppercase transition-colors">
                                {j.technician_id ? '👤 Reassign' : '➕ Assign'}
                            </button>
                        </div>
                    </div>
                ))}
                {jobs.length === 0 && <p className="text-center py-20 text-slate-500">No active jobs. Create one to get started!</p>}
            </div>

            {/* Assignment Modal */}
            {showAssignModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
                    <div className="glass-dark rounded-2xl shadow-2xl max-w-md w-full p-8 border border-slate-700/50 animate-in scale-95 zoom-in-50">
                        <h3 className="text-lg font-bold text-white mb-6">Assign Technician to Job</h3>
                        <div className="space-y-2 mb-6 max-h-64 overflow-y-auto">
                            {technicians.map(t => (
                                <button 
                                    key={t.user_id} 
                                    onClick={() => assignJob(selectedJobId, t.user_id)} 
                                    className="w-full text-left bg-slate-900/50 hover:bg-indigo-600/30 border border-slate-700/30 hover:border-indigo-500/50 p-4 rounded-lg text-slate-200 hover:text-indigo-300 transition-all font-semibold"
                                >
                                    {t.full_name}
                                </button>
                            ))}
                        </div>
                        <button onClick={() => setShowAssignModal(false)} className="w-full py-3 bg-slate-800/50 hover:bg-slate-700/50 text-slate-300 rounded-lg font-semibold text-sm transition-colors">Cancel</button>
                    </div>
                </div>
            )}

            {showIntake && <IntakeModal onClose={() => { setShowIntake(false); loadJobs(); }} onSaved={() => { setShowIntake(false); loadJobs(); }} />}
        </div>
    );
};


// ===== 2. UPDATE INTAKE MODAL COMPONENT =====
// Add these state variables and functions to IntakeModal:

const IntakeModal = ({ onClose, onSaved }) => {
    const [photoPath, setPhotoPath] = useState(null);
    const [technicians, setTechnicians] = useState([]);
    const [modelSuggestions, setModelSuggestions] = useState([]);
    const [ownerSuggestions, setOwnerSuggestions] = useState([]);
    const [showModelDropdown, setShowModelDropdown] = useState(false);
    const [showOwnerDropdown, setShowOwnerDropdown] = useState(false);
    const fileInput = useRef(null);
    
    // Peugeot models commonly found in Sri Lanka
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

    useEffect(() => {
        const loadData = async () => {
            // Load technicians
            const tecRes = await callDB('db-query', { 
                sql: "SELECT user_id, full_name FROM users WHERE role = 'technician' ORDER BY full_name" 
            });
            if (tecRes.success) setTechnicians(tecRes.data);
            
            // Load owner suggestions
            const ownerRes = await callDB('db-query', { 
                sql: "SELECT DISTINCT current_owner FROM vehicles WHERE current_owner IS NOT NULL ORDER BY current_owner" 
            });
            if (ownerRes.success) setOwnerSuggestions(ownerRes.data.map(o => o.current_owner).filter(o => o));
        };
        loadData();
    }, []);
    
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

    // In the JSX, replace the model field with:
    {/* REPLACE THIS FIELD */}
    <div className="relative">
        <Input 
            label="Make & Model" 
            name="model" 
            required 
            placeholder="e.g., Peugeot 308"
            onChange={(e) => handleModelInput(e.target.value)}
        />
        {showModelDropdown && (
            <div className="absolute top-full left-0 right-0 bg-slate-800 border border-slate-700 rounded-lg mt-1 z-10 max-h-40 overflow-y-auto shadow-lg">
                {peugeotModels.map(model => (
                    <button 
                        key={model} 
                        type="button" 
                        onClick={() => handleSelectModel(model)} 
                        className="w-full text-left px-4 py-2 text-slate-200 hover:bg-indigo-600/30 transition-colors text-sm font-medium"
                    >
                        🚗 {model}
                    </button>
                ))}
            </div>
        )}
    </div>

    // And replace the owner field with:
    {/* REPLACE THIS FIELD */}
    <div className="relative">
        <Input 
            label="Owner Name" 
            name="owner" 
            required
            onChange={(e) => handleOwnerInput(e.target.value)}
        />
        {showOwnerDropdown && (
            <div className="absolute top-full left-0 right-0 bg-slate-800 border border-slate-700 rounded-lg mt-1 z-10 max-h-40 overflow-y-auto shadow-lg">
                {ownerSuggestions.filter(o => o).map(owner => (
                    <button 
                        key={owner} 
                        type="button" 
                        onClick={() => handleSelectOwner(owner)} 
                        className="w-full text-left px-4 py-2 text-slate-200 hover:bg-indigo-600/30 transition-colors text-sm font-medium"
                    >
                        👤 {owner}
                    </button>
                ))}
            </div>
        )}
    </div>


// ===== 3. VALIDATION FOR PEUGEOT MODELS =====
// In the handleSubmit function of IntakeModal, add validation:

const peugeotModelsList = ['208', '307', '308', '3008', '2008', '206', '207', '407', '508', '5008', '106', '107', '108', '306', '406', '407', '605', '607', '806', '807'];

const validatePeugeotModel = (model) => {
    return peugeotModelsList.some(m => model.toLowerCase().includes(m));
};

// Before creating the vehicle, add:
if (!validatePeugeotModel(d.model)) {
    return alert("⚠️ Please enter a valid Peugeot model (e.g., Peugeot 308)");
}


// ===== 4. INVENTORY AUTOCOMPLETE =====
// Add similar autocomplete to Inventory component for parts:

const [partSuggestions, setPartSuggestions] = useState([]);
const [showPartDropdown, setShowPartDropdown] = useState(false);

const loadPartSuggestions = async () => {
    const res = await callDB('db-query', { 
        sql: "SELECT DISTINCT part_name FROM inventory ORDER BY part_name" 
    });
    if (res.success) setPartSuggestions(res.data.map(p => p.part_name));
};

useEffect(() => { loadPartSuggestions(); }, []);

// Then add dropdown UI for part name input in the stock receipt form
