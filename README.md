# Acoustic Matrix / Sound Visualizer v1.2.0

Live: https://shubhamarya-uxnai.github.io/music-composer/

Upload audio to build a local 3D time, frequency, and amplitude map. The browser decodes the file locally, defaults to a continuous sonograph surface in 3D and 2D frequency views, overlays beat lines and detected onset markers, and reveals note/frequency-region hover tooltips. Public link import is a future backend integration, and the demo map is shown before an upload.

The frontend is React and uses BA design-system buttons, `Loader`, and `ProgressBar` components through `react-app/src/ui.tsx`. The canvas analysis engine stays in `app/app.js`. See `DESIGN_SYSTEM.md` for the adapter and build workflow.
