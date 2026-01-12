# Feature Updates Required

Based on your requirements, here are the features that need to be implemented:

## 1. Job Assignment for Technicians After Creation
- **Location**: Dashboard component
- **Feature**: Add button on job cards to assign/reassign technician
- **Changes**:
  - Add state for showAssignModal, selectedJobId, technicians array
  - Create assignJob function with DB update
  - Add modal with technician dropdown
  - Add "Assign" button on each job card

## 2. Technician Mode on Web Server
- **Issue**: Technician PIN auth works in app but not on web server
- **Solution**: Add web endpoint in main.js for tech auth
- **Changes**:
  - Add POST /api/tech-login endpoint  
  - Return tech user data for web access
  - Fix route handling for web tech dashboard

## 3. Autofill/Autocomplete for Fields
- **Fields to Enable**: Make & Model, Owner Name, Part Name
- **Source**: Most-used values from database
- **Changes**:
  - Query distinct values from vehicles/inventory tables
  - Add dropdown UI with filtering
  - Highlight most common values

## 4. Database-Driven Suggestions
- **Make & Model**: Query most-used from vehicles table
- **Owner**: Query distinct owners, sorted by frequency
- **Parts**: Query most-used from job_parts table
- **Implementation**: Add GET endpoints for suggestions

## 5. Peugeot-Exclusive System
- **Update Models**: Replace generic models with Peugeot lineup
- **Models**: 208, 307, 308, 3008, 2008, 206, 207, 407, 508, 5008
- **Validation**: Accept only Peugeot models
- **Display**: Show Peugeot branding prominently

## Implementation Priority
1. ✅ Database schema (already supports all fields)
2. ⏳ Technician assignment modal (add to Dashboard)
3. ⏳ Web server tech endpoints (add to main.js)
4. ⏳ Autocomplete dropdowns (add to IntakeModal & Inventory)
5. ⏳ Peugeot model validation (update vehicle intake)
