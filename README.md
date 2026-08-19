# overstandEarly

A minimal React + Vite prototype for the overstand four-stage workflow:

- **Gather** source text from built-in story text or Wikipedia URLs
- **Construct** versioned word models, logical facts, and regression checks
- **Edit** graph nodes and edges visually in memory
- **Query** the constructs at runtime without AI

## Technologies

- **React 19** — UI component library
- **Vite 8** — fast dev server and build tool
- **@vitejs/plugin-react** — React Fast Refresh support in Vite
- **oxlint** — fast JavaScript/TypeScript linter
- **Node.js built-in test runner** — zero-dependency unit tests (`node --test`)

## Scripts

- `npm install`
- `npm run dev`
- `npm run build`
- `npm run lint`
- `npm run test`
