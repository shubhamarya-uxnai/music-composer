import { useEffect, useRef, useState } from "react"
import { createRoot } from "react-dom/client"
import { Action, IconAction, Select, Surface } from "./ui"
import engineUrl from "../../app/app.js?url"
import "./styles.css"

function Setting({ label, values, attribute }: { label: string; values: [string, string][]; attribute: string }) {
  return <label className="setting-row"><span>{label}</span><select defaultValue={document.documentElement.getAttribute(attribute) || values[0][0]} onChange={event => { document.documentElement.setAttribute(attribute, event.target.value); localStorage.setItem(`acoustic-${attribute}`, event.target.value) }}>{values.map(([value, text]) => <option value={value} key={value}>{text}</option>)}</select></label>
}

function App() {
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [motionActive, setMotionActive] = useState(false)
  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    for (const attribute of ["data-theme", "data-contrast", "data-temperature", "data-text-scale"]) {
      const saved = localStorage.getItem(`acoustic-${attribute}`)
      if (saved) document.documentElement.setAttribute(attribute, saved)
    }
    document.querySelectorAll<HTMLButtonElement>(".view-mode-button").forEach((button, index) => { button.dataset.mode = ["3d", "amplitude", "frequency"][index] })
    const onMotion = (event: Event) => setMotionActive((event as CustomEvent<boolean>).detail)
    window.addEventListener("acoustic:motion", onMotion)
    // The analysis and canvas engine expects these stable DOM ids and runs after React mounts.
    const script = document.createElement("script")
    script.src = engineUrl
    document.body.appendChild(script)
    return () => window.removeEventListener("acoustic:motion", onMotion)
  }, [])
  useEffect(() => { if (settingsOpen) dialog.current?.showModal(); else dialog.current?.close() }, [settingsOpen])
  return <main className="app-shell">
    <section className="topbar" aria-label="Song analysis setup">
      <div className="brand-block"><p className="ds-type-label-caption eyebrow">Acoustic Matrix · React</p><h1 className="ds-type-page-title">Song to 3D Map</h1></div>
      <div className="source-controls">
        <div className="upload-control"><input id="audio-file" type="file" accept="audio/*"/><Action className="upload-button" kind="primary" size="large" onClick={() => document.getElementById("audio-file")?.click()}>Upload audio</Action></div>
        <label className="link-field"><span className="ds-type-label-micro">Link import contract</span><input id="source-link" type="url" placeholder="Paste a public audio/video URL"/></label>
        <Action id="mock-link" className="link-check-button" size="large"><span id="link-spinner" className="button-spinner" aria-hidden="true"/><span id="link-button-label">Check link</span></Action>
      </div>
      <IconAction icon="settings" title="Appearance settings" onClick={() => setSettingsOpen(true)}/>
    </section>
    <section className="matrix-layout">
      <aside className="side-panel" aria-label="Analysis details">
        <Surface className="panel-section status-panel"><p className="ds-type-label-caption">Current source</p><h2 id="track-name" className="ds-type-section-title">No song loaded</h2><p id="status-text" className="ds-type-body-small">Upload an MP3, WAV, M4A, or FLAC file. The browser will decode it locally and build the first acoustic map.</p></Surface>
        <Surface className="panel-section audio-panel"><p className="ds-type-label-caption">Listen</p><audio id="audio-player" controls preload="metadata"/><p id="audio-status" className="ds-type-body-small">Audio controls appear after upload.</p></Surface>
        <div className="metrics-grid" aria-label="Analysis metrics">{([ ["BPM","metric-bpm"], ["Duration","metric-duration"], ["Beat slab","metric-beat"], ["Points","metric-points"] ] as const).map(([label,id]) => <div className="metric" key={id}><span className="ds-type-label-micro">{label}</span><strong id={id} className="ds-type-data-metric-secondary">--</strong></div>)}</div>
        <Surface className="panel-section"><p className="ds-type-label-caption">Map rules</p><dl className="axis-list"><div><dt>X</dt><dd>Time, 0s to song end</dd></div><div><dt>Z</dt><dd>Frequency, 20Hz to 20kHz, log scale around 440Hz</dd></div><div><dt>Y</dt><dd>Amplitude, normalized dB energy</dd></div></dl></Surface>
        <Surface className="panel-section scale-panel"><p className="ds-type-label-caption">Scales</p><Select id="frequency-scale" label="Frequency" choices={[["log","Log2 around 440Hz"],["ln","Natural log"],["linear","Linear"]]}/><Select id="amplitude-scale" label="Amplitude" choices={[["db","dB perceptual"],["ln","Natural log"],["linear","Linear"]]}/></Surface>
        <Surface className="panel-section pipeline"><p className="ds-type-label-caption">Backend plug-in plan</p><ol><li><strong>yt-dlp + FFmpeg</strong> for link extraction, verification, and clean WAV normalization.</li><li><strong>librosa</strong> for production BPM, beat grid, STFT/CQT, and persisted map JSON.</li></ol></Surface>
      </aside>
      <section className="viewer-panel" aria-label="3D acoustic map" data-ba-component="Surface" data-ba-surface="default">
        <div className="viewer-toolbar"><div><p id="viewer-mode-label" className="ds-type-label-caption">3D acoustic space</p><p id="viewer-subtitle" className="ds-type-body-small">Demo field shown until audio is loaded.</p></div><div className="view-controls"><div className="view-switcher" aria-label="View mode"><Action className="view-mode-button">3D</Action><Action className="view-mode-button">2D Amp</Action><Action className="view-mode-button">2D Freq</Action></div><IconAction id="reset-view" icon="restart_alt" title="Reset view"/><IconAction id="toggle-motion" icon={motionActive ? "pause" : "play_arrow"} title={motionActive ? "Pause motion" : "Play motion"}/></div></div>
        <div className="timeline-toolbar" aria-label="Timeline zoom"><label><span className="ds-type-label-micro">Timeline scale</span><input id="timeline-zoom" type="range" min="1" max="8" step="0.1" defaultValue="1"/></label><span id="timeline-zoom-value" className="ds-type-label-micro">1.0x</span><label><span className="ds-type-label-micro">Timeline position</span><input id="timeline-pan" type="range" min="0" max="0" step="0.001" defaultValue="0"/></label><Select id="render-style" label="Render" choices={[["points","Points"],["surface","Continuous plane"],["hybrid","Plane + points"]]}/><label><span className="ds-type-label-micro">Base</span><input id="base-color" type="color" defaultValue="#4b5563"/></label><label><span className="ds-type-label-micro">Active</span><input id="active-color" type="color" defaultValue="#68d6b9"/></label></div>
        <canvas id="matrix-canvas" width="1280" height="820"/><div className="legend" aria-label="Map legend"><span>Quiet</span><div className="legend-ramp"/><span>Loud</span></div>
      </section>
    </section>
    <dialog className="appearance-dialog" ref={dialog} onClose={() => setSettingsOpen(false)}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><h2>Appearance</h2><IconAction icon="close" title="Close settings" onClick={() => setSettingsOpen(false)}/></div><Setting label="Theme" attribute="data-theme" values={[["dark","Dark"],["light","Light"]]}/><Setting label="Contrast" attribute="data-contrast" values={[["default","Default"],["high","High"]]}/><Setting label="Temperature" attribute="data-temperature" values={[["cool","Cool"],["warm","Warm"]]}/><Setting label="Text size" attribute="data-text-scale" values={[["1","1x"],["1.2","1.2x"],["1.4","1.4x"]]}/></dialog>
  </main>
}

createRoot(document.getElementById("root")!).render(<App />)
