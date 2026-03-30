# Card Inventory Management Project Details

## Overview
This project is a frontend-only Card Factory / Card Inventory Management system built with React 19 and Vite. It models the operational flow from procurement to production to finance inside a single-page application with in-memory state.

The current implementation does not use a backend, database, router, or API layer. Most business data is initialized in `src/App.jsx` and passed down through props to view components.

## Tech Stack
- React 19
- Vite 7
- Tailwind CSS 3
- ESLint 9
- `lucide-react` for icons

## Application Structure
- `src/main.jsx`: application bootstrap.
- `src/App.jsx`: central state container, mock seed data, view switching, and workflow handlers.
- `src/components/Sidebar.jsx`: persistent navigation shell.
- `src/views/`: screen-level modules for each workflow.
- `public/` and `src/assets/`: static assets.

## Core Business Domains
### Procurement
Tracks letters of credit, shipments, shipment step progress, warehouse receipt, and procurement costs.

Primary views:
- `Dashboard.jsx`
- `LCList.jsx`, `LCDetail.jsx`, `LCForm.jsx`
- `ShipmentDetail.jsx`, `ShipmentView.jsx`, `AllShipments.jsx`
- `Warehouse.jsx`, `Reports.jsx`

### Production
Handles inbound materials, box creation, issuing material to production, shift updates, finished goods, and client rejections.

Primary views:
- `ProductionDashboard.jsx`
- `InboundMaterialsList.jsx`, `InboundReceiving.jsx`, `InboundShipmentBoxes.jsx`
- `BoxList.jsx`, `BoxDetail.jsx`, `BoxCreation.jsx`, `ProductionIssue.jsx`
- `ProductionFloor.jsx`, `Production.jsx`
- `SubBoxList.jsx`, `SubBoxCreation.jsx`, `SubBoxDetail.jsx`, `ClientRejection.jsx`, `CreateChallan.jsx`

### Employee Management
Tracks employees and shift rosters.

Primary views:
- `EmployeeList.jsx`, `EmployeeForm.jsx`
- `ShiftRosterList.jsx`, `ShiftAssignment.jsx`, `ShiftUpdateModal.jsx`

### Finance
Calculates landing cost and local costs from procurement and production data.

Primary views:
- `FinanceDashboard.jsx`
- `LandingCost.jsx`
- `LocalCosts.jsx`

## State and Data Flow
`src/App.jsx` owns the main application state:
- `lcs`: LC records with nested shipments and shipment step data
- `employees`: employee master data
- `productionAssignments`: shift assignments
- `inboundMaterials`: materials derived from warehouse-dispatched or completed shipments
- `boxes`: production material boxes
- `subBoxes`: finished goods and wastage records
- `localCosts`, `financeData`, `clientRejections`, `productionShifts`, `shiftSummaries`

Navigation is string-based, using `currentView` rather than React Router. Example view IDs include `'lc-list'`, `'inbound-list'`, and `'shift-roster-list'`.

## Workflow Summary
1. Create or update LCs and shipments.
2. Mark warehouse dispatch/receipt to generate inbound materials.
3. Receive materials and optionally auto-create boxes.
4. Issue boxes to production shifts.
5. Record production consumption and finished goods sub-boxes.
6. Capture client rejections and challan preparation.
7. Review finance dashboards and local operating costs.

## Development Commands
- `npm run dev`: start local development server
- `npm run build`: build for production
- `npm run preview`: preview production build
- `npm run lint`: run ESLint

## Current Constraints
- No automated tests are configured.
- No persistence layer; refresh resets runtime changes back to seed data.
- Some features appear partially wired in `App.jsx` (`profitability`, `cost-reports`) and should be checked before extending.
- The codebase mixes semicolon and non-semicolon styles; preserve local file consistency when editing.

## Recommended Improvement Areas
- Introduce React Router or a dedicated navigation layer.
- Move large mock datasets and domain logic out of `App.jsx`.
- Add a backend or local persistence.
- Add automated tests for workflow handlers and critical views.
