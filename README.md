# Acoustic Matrix / Sound Visualizer

Live: https://shubhamarya-uxnai.github.io/music-composer/

Upload audio to build a local 3D time, frequency, and amplitude map. The browser decodes the file locally. Public link import is a future backend integration, and the demo map is shown before an upload.

The frontend is React and uses BA design-system buttons through `react-app/src/ui.tsx`. The canvas analysis engine stays in `app/app.js`. See `DESIGN_SYSTEM.md` for the adapter and build workflow.
