# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

## Tiger Skin

The desktop is skinned to resemble Mac OS X Tiger (10.4) Aqua / Unified. You can swap assets and change the wallpaper without editing component code.

### Where to swap icons

- **Desktop and Dock:** Replace the PNGs in `public/assets/icons/`:
  - `icon-visualizer.png` (Visualizer app)
  - `icon-files.png` (Files app)
- Use 48x48 (or higher) PNGs. The UI references these paths; replace the files and rebuild (or rely on dev server) to see changes.

### How to change wallpaper

- **Default:** `public/assets/wallpapers/tiger-default.jpg`. Replace this file to change the default background.
- **Config:** In `src/config/uiConfig.ts`, `UI_CONFIG.wallpaperUrl` points to the default. You can change it to another path under `public/`.
- **Override at runtime:** Set `localStorage.wallpaperUrl` to a full URL or path (e.g. `"/assets/wallpapers/my.jpg"`). The desktop reads this in `getWallpaperUrl()` and uses it when present.
- Background behavior: full-screen, centered, cover, no scroll, behind menu bar and dock.

### Where theme tokens live

- **JS/TS:** `src/theme/tiger.ts` defines `TIGER_THEME` (colors, radii, shadows, spacing, dock sizing). `src/theme/appTheme.ts` selects the active theme (currently Tiger).
- **CSS:** `src/styles/tiger.css` defines variables under `.theme-tiger` (e.g. `--tiger-menuBar`, `--tiger-titlebarTop`, `--tiger-windowBg`, `--tiger-shadowWindow`) and the classes: `.menuBar`, `.dock`, `.dockIcon`, `.window-frame`, `.titleBar`, `.trafficLights`, `.traffic-close`, `.traffic-minimize`, `.traffic-zoom`, `.windowContent`. The desktop root uses the `theme-tiger` class so these apply.
