# AGENTS.md

## Cursor Cloud specific instructions

### Overview
**Rey Pez** is a Vue 2 SPA for managing a seafood business (sales, accounts, shipments, inventory, orders, debts, loans, boats). All data lives in Firebase Firestore/Realtime Database (cloud); there is no custom backend.

### Tech stack
- Vue 2.6 + Vue Router 3 + Pinia + BootstrapVue 2 + Bootstrap 5
- Build: Vue CLI 4.5 (Webpack)
- Node.js 20.15.0 (use `nvm use 20.15.0`)

### Running the app
- `npm run start` — dev server on port 8080 (see `package.json` scripts)
- `npm run lint` — ESLint (requires `@vue/cli-plugin-eslint` and `eslint-plugin-vue`; install with `--legacy-peer-deps` if missing)
- `npm run build:web` — production build (web only)

### Non-obvious caveats
1. **Auth bypass in development**: The router guard at `src/router.js` skips authentication when `NODE_ENV=development`, so no login is needed for local dev.
2. **Missing lint plugins**: The repo's `package.json` does not list `@vue/cli-plugin-eslint` or `eslint-plugin-vue` as dependencies. They must be installed separately for `npm run lint` to work: `npm install --save-dev @vue/cli-plugin-eslint@~4.5.0 eslint-plugin-vue@7 --legacy-peer-deps`.
3. **ESLint warnings on lint**: The codebase has many pre-existing lint warnings (unused vars, prop mutations, etc.). These are not regressions — they exist in the original code.
4. **Firebase (cloud)**: The app connects directly to a live Firebase project (`reypezapp-1ced2`). Internet access is required. There are no Firebase emulators configured.
5. **No automated test suite**: There is no configured test runner. A single `SaveManager.test.js` file exists but no test framework in dependencies.
6. **Electron/Capacitor**: Desktop (`npm run electron:dev`) and mobile (Capacitor/iOS) targets are optional and not needed for standard web development.
