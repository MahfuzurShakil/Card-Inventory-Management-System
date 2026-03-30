# Repository Guidelines

## Project Structure & Module Organization
This repository is a Vite + React 19 frontend. Main application code lives in `src/`.

- `src/main.jsx`: app bootstrap.
- `src/App.jsx`: top-level state and view routing.
- `src/views/`: screen-level modules such as `LCList.jsx`, `ProductionFloor.jsx`, and `FinanceDashboard.jsx`.
- `src/components/`: shared UI such as `Sidebar.jsx`.
- `src/index.css` and `src/App.css`: global and app-level styling.
- `public/`: static assets served directly by Vite.

Keep new view files in `src/views/` and shared, reusable UI in `src/components/`.

## Project Context For Coding Agents
This app is a frontend-only card factory management system covering procurement, production, employee rosters, and finance. The main orchestration point is `src/App.jsx`, which contains seeded mock data, string-based view navigation, and the core state update handlers.

Key state domains in `src/App.jsx`:
- `lcs` and nested `shipments`
- `inboundMaterials`
- `boxes` and `subBoxes`
- `employees` and `productionAssignments`
- `localCosts`, `financeData`, `clientRejections`, `productionShifts`, `shiftSummaries`

Before editing a workflow, trace how data is created and mutated in `src/App.jsx`, then inspect the related screen in `src/views/`. Be careful with derived flows:
- inbound materials are created from warehouse shipment data
- boxes are created from received inbound materials
- production consumes boxes and creates sub-box output
- finance derives costs from LC, shipment, and local cost state

Use [PROJECT_DETAILS.md](/E:/Personal/Project/New%20folder/Card%20Inventory%20Management/Card%20Inventory%20Management/PROJECT_DETAILS.md) for a fuller functional overview before making larger changes.

## Build, Test, and Development Commands
- `npm run dev`: start the local Vite dev server with HMR.
- `npm run build`: create a production build in `dist/`.
- `npm run preview`: serve the production build locally.
- `npm run lint`: run ESLint across `.js` and `.jsx` files.

Run `npm run lint` before opening a PR. There is currently no `npm test` script in `package.json`.

## Coding Style & Naming Conventions
Use React function components and ES modules. Follow the existing naming pattern:

- Component and view files: PascalCase, for example `InboundReceiving.jsx`.
- Variables, props, and state setters: camelCase, for example `selectedShipment` and `setBoxes`.
- Route/view IDs: lowercase kebab-case strings such as `'shift-roster-list'`.

ESLint (`eslint.config.js`) is the main enforcement tool. Prefer small, focused components, keep business logic readable, and preserve the current Tailwind utility approach in JSX. Match the surrounding file’s punctuation and spacing when editing; consistency inside the file matters more than forcing a new style.

## Testing Guidelines
Automated tests are not set up yet. For now:

- lint every change with `npm run lint`
- smoke-test affected flows in `npm run dev`
- document manual verification in the PR

If you add tests later, place them beside the feature or under a dedicated `src/tests/` folder, using `*.test.jsx` naming.

## Commit & Pull Request Guidelines
Recent commits use short, task-focused summaries, for example: `Production floor related issue fixed` and `Update Inbound received print modal, add CSV file add feature`.

- Keep commit messages imperative and specific to the affected workflow.
- Limit each PR to one feature or fix area.
- Include a short description, impacted screens, manual test notes, and screenshots for UI changes.
- Link the related issue or task when available.

## Security & Configuration Tips
Do not commit secrets or environment-specific credentials. Review `package.json`, Tailwind, and Vite config changes carefully because they affect the whole app build.
