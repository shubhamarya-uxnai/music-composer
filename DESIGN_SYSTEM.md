# BA design-system integration

The Acoustic Matrix frontend is a React app in `react-app/`. It imports BA React components and the shared consumer stylesheet from the sibling `va-design-system` checkout at build time. The published site contains the compiled result and does not require the BA CDN at runtime.

`react-app/src/ui.tsx` is the component adapter. Product code uses `Action`, `IconAction`, `Surface`, and `Select`. BA buttons and icon buttons are mapped there. `Select` remains a native control until BA publishes a tested Dropdown; replacing that one adapter function is the intended upgrade path. New BA components are adopted deliberately after checking their behavior and appearance rather than automatically inheriting an unreviewed variant.

The audio analysis and canvas renderer remain in `app/app.js`. React mounts stable controls before loading that engine, so file upload, view mode, scale, zoom, pan, colors, and playback retain their existing behavior. `legacy.html` is the preserved pre-React page.

Build from `react-app/` with `npm run build`. The BA checkout is expected at `../../../va-design-system` relative to that directory, or set `BA_DESIGN_SYSTEM_DIR`. The output goes to the repository root for GitHub Pages. Vite uses relative asset URLs because this is a GitHub Pages project subpath.
