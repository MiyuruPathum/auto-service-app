# 🚀 Quick Start Guide

## Installation & Setup

### 1. Install Dependencies
```bash
cd d:\auto-service-app
npm install
```

### 2. Seed Database with Peugeot Data
```bash
node seed-db.js
```

### 3. Start Application
```bash
npm start
```

The application will launch with:
- Electron desktop window
- Express server on `http://localhost:3000`
- SQLite database (`workshop.db`)

---

## Feature Usage

### 🎯 Job Technician Assignment

**Scenario**: Created a job, now need to assign technician

1. Go to **Dashboard** (default view)
2. Find the job card (shows license plate and model)
3. Click **"➕ Assign"** button (yellow, bottom right of card)
4. Modal pops up: "Assign Technician to Job"
5. Click technician name from list
6. ✅ Done! Job is assigned, list refreshes

**Reassigning**: If job already has technician, button shows **"👤 Reassign"** instead

---

### 📝 Creating Job with Autocomplete

**Scenario**: New Peugeot customer comes in

1. Click **"+ New Intake"** button (blue, top right)
2. Modal opens: "New Vehicle Intake"
3. **Upload photo** (optional, click area)
4. **License Plate**: Enter plate (e.g., "CAB-1234")
5. **Make & Model** (with autocomplete):
   - Type "peugeot" or any number (e.g., "308")
   - Dropdown appears with Peugeot models
   - Click model to select (e.g., "🚗 Peugeot 308")
6. **Owner Name** (with autocomplete):
   - Start typing customer name
   - Previous customers appear in dropdown
   - Click to auto-fill
7. **Phone**: Enter contact number
8. **Mileage**: Enter vehicle mileage
9. **Technician** (optional): Select from dropdown or assign later
10. Click **"Create Job"**
11. ✅ Form validates Peugeot model
12. Vehicle added to database
13. Job created and appears on Dashboard

---

### ✅ Validation Rules

#### Peugeot Model Validation
- ✅ **Accepted**: "Peugeot 308", "peugeot 308", "P308", "308"
- ❌ **Rejected**: "Toyota Corolla", "Honda City", "BMW 3-Series"
- Error message: "⚠️ This workshop services Peugeot vehicles exclusively..."

#### License Plate Formats
- ✅ **ABC-1234** (3 letters + 4 numbers)
- ✅ **AB-1234** (2 letters + 4 numbers)
- ✅ **12-3456** (2 numbers + 4 numbers)
- ❌ **ABC123** (invalid format)

#### Phone Number
- ✅ **0771234567** (10 digits starting with 0)
- ❌ **0771234** (too short)
- ❌ **+94771234567** (doesn't accept + prefix)

---

## Supported Peugeot Models

| Model | Type | Notes |
|-------|------|-------|
| **Peugeot 208** | City Car | Most popular, compact |
| **Peugeot 307** | Compact Sedan | Mid-range, common |
| **Peugeot 308** | Mid-size Sedan | Popular in Sri Lanka ⭐ |
| **Peugeot 3008** | Compact SUV | Growing market ⭐ |
| **Peugeot 2008** | Subcompact SUV | Popular ⭐ |
| **Peugeot 206** | City Car | Older model |
| **Peugeot 207** | Compact | Older model |
| **Peugeot 407** | Large Sedan | Premium segment |
| **Peugeot 508** | Premium Sedan | Latest models ⭐ |
| **Peugeot 5008** | Large SUV | 7-seater |

Others also accepted (106, 107, 108, 306, 406, 605, 607, 806, 807)

---

## Database Seeding

### What Gets Seeded?

#### 1. Technicians (5 users)
| Name | PIN | Rate (රු/hour) | Role |
|------|-----|---------|------|
| Arjun Perera | 1234 | 850 | Technician |
| Kumara Silva | 5678 | 950 | Technician |
| Priyanka Jayawardene | 9101 | 1000 | Technician |
| Roshan Weerasinghe | 1121 | 900 | Technician |
| Samantha Rathnayake | 0000 | - | Manager |

#### 2. Vehicles (6 Peugeot cars)
- Peugeot 308 (CAB-4567)
- Peugeot 3008 (WP-LA-1234)
- Peugeot 2008 (MTR-5890)
- Peugeot 307 (KTY-2341)
- Peugeot 508 (JJC-8901)
- Peugeot 208 (NWP-3456)

#### 3. Parts (10 inventory items)
- Spark plugs, oil filters, air filters
- Battery, brake pads, coolant
- Wipers, tire sealant, transmission fluid
- Alternator belt

#### 4. Sample Jobs & Tasks
- 6 jobs with different statuses
- Tasks assigned to jobs
- Parts installed records

---

## API Endpoints (Express Server)

### Web Technician Login

**Endpoint**: `POST /api/tech-login`

**Request**:
```json
{
    "pin": "1234"
}
```

**Success Response**:
```json
{
    "success": true,
    "data": {
        "user_id": 1,
        "full_name": "Arjun Perera",
        "pin": "1234",
        "hourly_rate": 850,
        "role": "technician"
    }
}
```

**Error Response**:
```json
{
    "success": false,
    "error": "Invalid PIN"
}
```

---

### Get Suggestions

**Endpoint**: `GET /api/suggestions/:type`

**Types**: `owners`, `models`, `parts`

**Example - Owner Suggestions**:
```
GET /api/suggestions/owners
```

**Response**:
```json
{
    "success": true,
    "data": [
        { "current_owner": "W.M. Perera" },
        { "current_owner": "K. Jayawardena" },
        { "current_owner": "R. Silva" }
    ]
}
```

**Example - Model Suggestions**:
```
GET /api/suggestions/models
```

**Response**:
```json
{
    "success": true,
    "data": [
        { "make_model": "Peugeot 208 (2019)" },
        { "make_model": "Peugeot 308 (2018)" },
        { "make_model": "Peugeot 3008 (2020)" }
    ]
}
```

---

## Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Close Modal | Esc (implementation optional) |
| Select Autocomplete | Arrow keys + Enter (standard browser) |
| Navigate Sidebar | Click buttons |
| Submit Form | Enter key |

---

## Troubleshooting

### Problem: Autocomplete dropdown doesn't appear
**Solution**: 
- Click input field and start typing
- Make sure field is focused
- Check browser console for errors

### Problem: Non-Peugeot model accepted
**Solution**:
- Validation requires model to contain a Peugeot number (208, 308, etc.)
- "Peugeot Corolla" won't work (Corolla is not Peugeot)
- Use exact model name like "Peugeot 308"

### Problem: Technician assignment not saving
**Solution**:
- Verify technician list loaded (modal should show names)
- Check database file exists (`workshop.db`)
- Try restarting application

### Problem: Phone number validation fails
**Solution**:
- Use Sri Lankan format: 0771234567 (starts with 0)
- Must be 10 digits total
- No spaces or special characters except dash in plate

### Problem: Database not seeding
**Solution**:
```bash
# Delete old database
rm workshop.db

# Re-run seed script
node seed-db.js

# Should see all ✓ checkmarks
```

---

## Test Credentials

### Technician Login (App PIN Pad)
- **PIN**: 1234 (Arjun Perera - 850 රු/hour)
- **PIN**: 5678 (Kumara Silva - 950 රු/hour)
- **PIN**: 9101 (Priyanka Jayawardene - 1000 රු/hour)
- **PIN**: 1121 (Roshan Weerasinghe - 900 රු/hour)

### Manager Login
- **PIN**: 0000 (Samantha Rathnayake)

### Test Vehicle Data
- **License Plate**: CAB-4567 (Peugeot 308)
- **Owner**: W.M. Perera
- **Phone**: 0771234567

---

## Feature Comparison

| Feature | Before | After |
|---------|--------|-------|
| Assign technician | After job created | Before/after creation |
| Model input | Free text | Autocomplete + validation |
| Owner input | Free text | Autocomplete suggestions |
| Vehicle types | Mixed brands | Peugeot only |
| Web technician access | IPC only | Express API ready |
| Suggestions | Manual entry | Database-driven |

---

## Support & Documentation

For detailed information, see:
- **Feature Implementation**: `IMPLEMENTATION_COMPLETE.md`
- **Code Reference**: `CODE_REFERENCE.md`
- **Feature Tracking**: `UPDATE_FEATURES.md`

---

## Quick Commands

```bash
# Start application
npm start

# Reseed database
node seed-db.js

# Test API endpoint
curl http://localhost:3000/api/suggestions/owners

# Check database
sqlite3 workshop.db "SELECT * FROM vehicles;"
```

---

**Status**: ✅ All Features Ready
**Version**: 1.0
**Last Updated**: 2024
