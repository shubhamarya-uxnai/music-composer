import { useEffect, useRef, useState } from "react"
import { createRoot } from "react-dom/client"
import "@ba-design-system/react/styles.css"
import { Action, Field, IconAction, Loader, ProgressBar, Select } from "./ui"
import engineUrl from "../../app/app.js?url"
import "./styles.css"

type AnalysisFeedback = {
  phase: "idle" | "loading" | "ready" | "error"
  progress: number
  label?: string
}

type ViewMode = "3d" | "amplitude" | "frequency"

const APPEARANCE_DEFAULTS = {
  "data-theme": "dark",
  "data-contrast": "",
  "data-temperature": "warm",
  "data-text-scale": "1",
  "data-screen": "",
} as const

type AppearanceAttr = keyof typeof APPEARANCE_DEFAULTS
type AppearanceState = Record<AppearanceAttr, string>

function readStoredAppearance(): AppearanceState {
  const next = { ...APPEARANCE_DEFAULTS } as AppearanceState
  for (const attr of Object.keys(APPEARANCE_DEFAULTS) as AppearanceAttr[]) {
    const saved = localStorage.getItem(`acoustic-${attr}`)
    if (saved !== null) next[attr] = saved
  }
  return next
}

function applyAppearanceAttributes(state: AppearanceState) {
  for (const [attr, value] of Object.entries(state)) {
    if (value) document.documentElement.setAttribute(attr, value)
    else document.documentElement.removeAttribute(attr)
  }
}

function Setting({ label, value, values, onChange }: { label: string; value: string; values: [string, string][]; onChange: (next: string) => void }) {
  return <label className="setting-row"><span>{label}</span><select value={value} onChange={event => onChange(event.target.value)}>{values.map(([val, text]) => <option value={val} key={val}>{text}</option>)}</select></label>
}

function App() {
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [motionActive, setMotionActive] = useState(false)
  const [linkChecking, setLinkChecking] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>("3d")
  const [analysisState, setAnalysisState] = useState<AnalysisFeedback>({ phase: "idle", progress: 0 })
  const [appearance, setAppearance] = useState<AppearanceState>(() => readStoredAppearance())
  const dialog = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    applyAppearanceAttributes(appearance)
  }, [appearance])

  useEffect(() => {
    document.querySelectorAll<HTMLButtonElement>(".view-mode-button").forEach((button, index) => {
      button.dataset.mode = (["3d", "amplitude", "frequency"] as const)[index]
    })
    const onMotion = (event: Event) => setMotionActive((event as CustomEvent<boolean>).detail)
    const onAnalysis = (event: Event) => setAnalysisState((event as CustomEvent<AnalysisFeedback>).detail)
    const onLink = (event: Event) => setLinkChecking(Boolean((event as CustomEvent<{ checking?: boolean }>).detail?.checking))
    const onViewMode = (event: Event) => setViewMode(((event as CustomEvent<ViewMode>).detail) || "3d")
    window.addEventListener("acoustic:motion", onMotion)
    window.addEventListener("acoustic:analysis", onAnalysis)
    window.addEventListener("acoustic:link", onLink)
    window.addEventListener("acoustic:viewmode", onViewMode)
    // The analysis and canvas engine expects these stable DOM ids and runs after React mounts.
    const script = document.createElement("script")
    script.src = engineUrl
    document.body.appendChild(script)
    return () => {
      window.removeEventListener("acoustic:motion", onMotion)
      window.removeEventListener("acoustic:analysis", onAnalysis)
      window.removeEventListener("acoustic:link", onLink)
      window.removeEventListener("acoustic:viewmode", onViewMode)
    }
  }, [])

  useEffect(() => { if (settingsOpen) dialog.current?.showModal(); else dialog.current?.close() }, [settingsOpen])

  const updateAppearance = (attr: AppearanceAttr, value: string) => {
    localStorage.setItem(`acoustic-${attr}`, value)
    setAppearance(current => ({ ...current, [attr]: value }))
  }

  const resetAppearance = () => {
    for (const attr of Object.keys(APPEARANCE_DEFAULTS) as AppearanceAttr[]) {
      localStorage.removeItem(`acoustic-${attr}`)
    }
    setAppearance({ ...APPEARANCE_DEFAULTS })
  }

  return <main className="app-shell">
    <header className="topbar" aria-label="Song analysis setup">
      <div className="brand-block"><p className="eyebrow">Acoustic Matrix · v1.2.2</p><h1 className="brand-title" data-ba-component="Display">Song to 3D Map</h1></div>
      <div className="source-bar" data-ba-component="Surface" data-ba-surface="default">
        <div className="upload-control"><input id="audio-file" type="file" accept="audio/*"/><Action className="upload-button" kind="primary" size="large" leadingIcon="upload" onClick={() => document.getElementById("audio-file")?.click()}>Upload audio</Action></div>
        <div className="link-field"><Field id="source-link" label="Link import contract" input="Paste a public audio/video URL" {...{ Label: false, "Leading Icon": true, "leading-icon": "link", "Tailing Icon": false, Button: false }} /></div>
        <div className="source-bar-actions"><Action id="mock-link" className="link-check-button" kind="ghost" size="large" enabled={!linkChecking}>{linkChecking && <Loader Type="Circular" className="link-loader" />}<span id="link-button-label">{linkChecking ? "Checking" : "Check link"}</span></Action><span className="source-bar-divider" aria-hidden="true"/><IconAction className="settings-trigger" icon="settings" size="large" title="Appearance settings" onClick={() => setSettingsOpen(true)}/></div>
      </div>
    </header>
    <section className="matrix-layout">
      <aside className="side-panel" data-ba-component="Sidebar" aria-label="Analysis details">
        <section className="panel-section status-panel"><p className="section-kicker">Current source</p><h2 id="track-name" className="section-heading">No song loaded</h2><p id="status-text" className="section-copy">Upload an MP3, WAV, M4A, or FLAC file. The browser will decode it locally and build the first acoustic map.</p>{analysisState.phase === "loading" && <div className="analysis-feedback"><Loader Type="Bar" className="analysis-bar-loader" /><ProgressBar Type="In Progress" value={analysisState.progress} className="analysis-progress" /></div>}{analysisState.phase === "ready" && <div className="analysis-feedback"><ProgressBar Type="Success" value={100} className="analysis-progress" /></div>}{analysisState.phase === "error" && <div className="analysis-feedback"><ProgressBar Type="Error" value={analysisState.progress} className="analysis-progress" /></div>}</section>
        <section className="panel-section audio-panel"><p className="section-kicker">Listen</p><audio id="audio-player" controls preload="metadata"/><p id="audio-status" className="section-copy">Audio controls appear after upload.</p></section>
        <section className="panel-section metrics-section" aria-label="Analysis metrics"><div className="metrics-grid">{([ ["BPM","metric-bpm"], ["Duration","metric-duration"], ["Beat slab","metric-beat"], ["Points","metric-points"] ] as const).map(([label,id]) => <div className="metric" key={id}><span className="metric-label">{label}</span><strong id={id} className="metric-value">--</strong></div>)}</div></section>
        <section className="panel-section"><p className="section-kicker">Map rules</p><dl className="axis-list"><div><dt>X</dt><dd>Time, 0s to song end</dd></div><div><dt>Z</dt><dd>Frequency, 20Hz to 20kHz, log scale around 440Hz</dd></div><div><dt>Y</dt><dd>Amplitude, normalized dB energy</dd></div></dl></section>
        <section className="panel-section scale-panel"><p className="section-kicker">Scales</p><Select id="frequency-scale" label="Frequency" choices={[["log","Log2 around 440Hz"],["ln","Natural log"],["linear","Linear"]]}/><Select id="amplitude-scale" label="Amplitude" choices={[["db","dB perceptual"],["ln","Natural log"],["linear","Linear"]]}/></section>
        <section className="panel-section pipeline"><p className="section-kicker">Backend plug-in plan</p><ol><li><strong>yt-dlp + FFmpeg</strong> for link extraction, verification, and clean WAV normalization.</li><li><strong>librosa</strong> for production BPM, beat grid, STFT/CQT, and persisted map JSON.</li></ol></section>
      </aside>
      <section className="viewer-panel" aria-label="3D acoustic map" data-ba-component="Surface" data-ba-surface="default">
        <div className="viewer-toolbar"><div><p id="viewer-mode-label" className="section-kicker">3D acoustic space</p><p id="viewer-subtitle" className="section-copy">Demo field shown until audio is loaded.</p></div><div className="view-controls"><div className="view-switcher" aria-label="View mode"><Action className="view-mode-button" kind={viewMode === "3d" ? "primary" : "ghost"} size="small">3D</Action><Action className="view-mode-button" kind={viewMode === "amplitude" ? "primary" : "ghost"} size="small">2D Amp</Action><Action className="view-mode-button" kind={viewMode === "frequency" ? "primary" : "ghost"} size="small">2D Freq</Action></div><IconAction id="reset-view" icon="restart_alt" size="small" title="Reset view"/><IconAction id="toggle-motion" icon={motionActive ? "pause" : "play_arrow"} size="small" enabled={viewMode === "3d"} title={motionActive ? "Pause motion" : "Play motion"}/></div></div>
        <div className="timeline-toolbar" aria-label="Timeline zoom"><div className="timeline-sliders"><label><span className="section-kicker">Timeline scale</span><input id="timeline-zoom" type="range" min="1" max="8" step="0.1" defaultValue="1"/></label><span id="timeline-zoom-value" className="section-kicker">1.0x</span><label><span className="section-kicker">Timeline position</span><input id="timeline-pan" type="range" min="0" max="0" step="0.001" defaultValue="0"/></label></div><div className="timeline-appearance"><Select id="render-style" label="Render" defaultValue="surface" choices={[["points","Points"],["surface","Continuous plane"],["hybrid","Plane + points"]]}/><label><span className="section-kicker">Base</span><input id="base-color" type="color" defaultValue="#4b5563"/></label><label><span className="section-kicker">Active</span><input id="active-color" type="color" defaultValue="#68d6b9"/></label></div></div>
        <canvas id="matrix-canvas" width="1280" height="820"/><div className="legend" aria-label="Map legend"><span>Quiet</span><div className="legend-ramp"/><span>Loud</span></div>
      </section>
    </section>
    <dialog className="appearance-dialog" ref={dialog} onClose={() => setSettingsOpen(false)}><div className="appearance-head"><h2>Appearance</h2><IconAction icon="close" size="small" title="Close settings" onClick={() => setSettingsOpen(false)}/></div><Setting label="Theme" value={appearance["data-theme"]} values={[["dark","Dark"],["light","Light"]]} onChange={v => updateAppearance("data-theme", v)}/><Setting label="Contrast" value={appearance["data-contrast"]} values={[["","Default"],["high","High"]]} onChange={v => updateAppearance("data-contrast", v)}/><Setting label="Temperature" value={appearance["data-temperature"]} values={[["warm","Warm"],["cool","Cool"]]} onChange={v => updateAppearance("data-temperature", v)}/><Setting label="Text size" value={appearance["data-text-scale"]} values={[["1","1x"],["1.2","1.2x"],["1.4","1.4x"]]} onChange={v => updateAppearance("data-text-scale", v)}/><Setting label="Screen size" value={appearance["data-screen"]} values={[["","Automatic"],["mobile","Mobile"],["tablet","Tablet"],["desktop","Desktop"]]} onChange={v => updateAppearance("data-screen", v)}/><div className="appearance-actions"><Action kind="ghost" size="small" onClick={resetAppearance}>Reset to default</Action></div><p className="section-copy appearance-version">Acoustic Matrix <strong>v1.2.2</strong> · <a href="https://github.com/shubhamarya-uxnai/music-composer/releases" target="_blank" rel="noopener noreferrer">Release history</a></p></dialog>
  </main>
}

createRoot(document.getElementById("root")!).render(<App />)
