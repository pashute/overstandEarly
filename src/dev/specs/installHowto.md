# Filename: installHowto.md
# Version: 0.1

# Install & Run — Developer Guide

## Prerequisites

- Node.js 20+
- npm 10+
- (optional) Vercel CLI for local serverless dev

## Install

```sh
npm install
```

## Run frontend (dev server)

```sh
npm run dev
# opens http://localhost:5173
```

## Run tests

```sh
# unit tests (Node built-in runner)
npm run test

# end-to-end API tests (in-process, no server)
npm run test:e2e

# both
npm run test:all
```

## Lint

```sh
npm run lint
```

## Build for production

```sh
npm run build
# output in dist/
```

## Preview production build

```sh
npm run preview
```

## Serverless API — local dev

```sh
npm install -g vercel   # one-time global install
vercel dev              # serves frontend + /api/* on http://localhost:3000
```

- Config: `vercel.json` at repo root.
- Handler: `api/query.js` — imports directly from `src/overstand.js`.
- No env vars required for prototype.

## Deploy to Vercel (free tier)

```sh
vercel login
vercel --prod
```

## Notes

- No database or external services required.
- All knowledge state lives in browser memory during a session.
- The `api/query.js` handler is stateless; the caller supplies `facts` and `wordModel`.
