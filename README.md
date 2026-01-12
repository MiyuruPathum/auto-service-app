PROJECT BLUEPRINT: WORKSHOP PRO (Automotive Service Management System)

1. Executive Summary

Workshop Pro is a professional, offline-capable desktop application designed for medium-sized automotive service centers. The system manages the end-to-end vehicle service lifecycle—from receptionist intake and technician assignment to inventory management with Weighted Average Cost (WAC) logic and financial reporting.

2. Technical Stack

Framework: Electron (Desktop Wrapper)

Database: SQLite3 (Local persistence)

Frontend: React (Single-file Monolithic UI)

Styling: Tailwind CSS (Professional/Modern UI with Plus Jakarta Sans font)

Runtime: Node.js

Network: Integrated Express server for local Wi-Fi access (Tablet Portal)

3. Core Database Schema & Logic

Tables

users: Stores staff details (Administrators and Technicians). Includes pin (4-digit) for tablet login.

vehicles: Tracks vehicle profiles. Keys: license_plate (Unique), vin, make_model, current_owner, contact_number, photo_path.

ownership_history: Tracks vehicle sales. Records old_owner, new_owner, mileage_at_transfer, and date.

inventory: Master stock list. Includes total_quantity, avg_cost (Weighted Average), retail_price, and min_threshold.

jobs: Central job record. Tracks vehicle_id, technician_id, status (pending, in-progress, waiting, completed), mileage_in, and total_price.

job_tasks: Checklist items per job (e.g., "Change Oil").

job_parts: Links inventory items to specific jobs. Records price_at_sale and cost_at_sale to preserve historical profit margins.

Critical Logic

Weighted Average Cost (WAC): When new stock is added, the system calculates: ((CurrentQty * CurrentAvg) + (NewQty * NewCost)) / (CurrentQty + NewQty).

Ownership Tracking: During intake, if the entered owner_name differs from the name in the vehicles table, the system automatically archives the previous owner details into ownership_history and updates the vehicle profile.

Inventory Restock: If a part is removed from an active job, the system performs a SQL Transaction to delete the job-link and increment the master inventory quantity simultaneously.

4. Functional Modules

A. Receptionist Module (Desktop)

Dashboard: Real-time overview of active repairs with "Traffic Light" status colors.

Vehicle Intake:

Form with validation (Plate regex, required fields).

Photo upload (stores local file path).

Auto-detection of returning vehicles vs. new vehicles.

Job Management:

Assigning/removing tasks.

Searching inventory to add parts (Live search).

Status control (Mark as Complete).

Print Engine: Branded PDF generation for invoices and job cards. Layout includes Header (Logo/Contact), Middle (Tasks/Parts Table), and Footer (Totals/Tax).

B. Technician Module (Tablet/Mobile)

Network Access: The main PC acts as a server (Express). Technicians access the UI via http://[PC-IP-ADDRESS]:3000.

PIN Login: 4-digit numeric keypad optimized for touch.

Active Job List: Simplified view of only cars currently assigned to the logged-in technician.

Interactive Checklist: Large, high-contrast toggle buttons for marking tasks as "Done."

C. Inventory Module

Stock Receiving: Form to add parts. If a part number exists, it prompts for a WAC update.

Low Stock Alerts: Visual indicators (Red badges) for items falling below min_threshold.

Search & Filter: Real-time filtering by category, name, or part number.

D. Reporting & Exporting

Financial Dashboard: Summary of revenue, completed jobs, and average ticket value.

Excel Export: Ability to generate .csv files for date-filtered job records for external accounting.

5. UI/UX Specifications

Theme: Slate/Blue/White palette (Clean, modern, high-trust).

Typography: Plus Jakarta Sans.

Responsiveness:

Desktop: Split-pane layouts for Job Details (History on right, Management on left).

Tablet: Card-based navigation with large touch targets (minimum 44x44px).

Feedback: Backdrops/Blur on modals, loading indicators during DB operations, and success alerts for intake.

6. Implementation Notes for AI Tools

Use Babel Standalone for the React-in-HTML setup to avoid complex build pipelines.

IPC communication must use ipcRenderer.invoke and ipcMain.handle.

Database operations involving inventory and jobs should be wrapped in db.serialize() or Transactions to ensure data integrity.

All frontend components (Dashboard, Intake, Inventory, Reports, TechPortal) are consolidated into a monolithic index.html for single-session reliability.