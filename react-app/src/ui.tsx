import type { ReactNode } from "react"
import { Button as BAButton, IconButton as BAIconButton } from "@ba-design-system/react"

export function Action({ children, id, className, kind = "ghost", size = "small", title, onClick, ...rest }: { children: ReactNode; id?: string; className?: string; kind?: "primary" | "ghost" | "default"; size?: "small" | "large"; title?: string; onClick?: () => void; "data-mode"?: string }) {
  return <BAButton id={id} className={className} title={title} onClick={onClick} {...rest} Type={kind === "primary" ? "Primary" : kind === "default" ? "Default" : "Ghost"} Size={size === "large" ? "Large" : "Small"} Enabled={true} {...{ "Leading Icon": false, "Tailing Icon": false }}>{children}</BAButton>
}
export function IconAction({ icon, id, title, onClick }: { icon: string; id?: string; title: string; onClick?: () => void }) {
  const paths: Record<string, ReactNode> = {
    settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l-1.86 1.86A1.7 1.7 0 0 0 16 18.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1.1h-2.6a1.7 1.7 0 0 0-.4-1.1 1.7 1.7 0 0 0-1-.6 1.7 1.7 0 0 0-1.88.34l-1.86-1.86A1.7 1.7 0 0 0 7.2 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1.1-.4V11a1.7 1.7 0 0 0 1.1-.4 1.7 1.7 0 0 0 .6-1 1.7 1.7 0 0 0-.34-1.88l1.86-1.86A1.7 1.7 0 0 0 10.6 6a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1.1h2.6a1.7 1.7 0 0 0 .4 1.1 1.7 1.7 0 0 0 1 .6 1.7 1.7 0 0 0 1.88-.34l1.86 1.86A1.7 1.7 0 0 0 19.4 9.4a1.7 1.7 0 0 0 .6 1 1.7 1.7 0 0 0 1.1.4v2.6a1.7 1.7 0 0 0-1.1.4 1.7 1.7 0 0 0-.6 1Z"/></>,
    restart_alt: <><path d="M4 11a8 8 0 1 1 2 6"/><path d="M4 5v6h6"/></>,
    play_arrow: <path d="m8 5 11 7-11 7Z" fill="currentColor" stroke="none"/>,
    pause: <><rect x="6" y="5" width="4" height="14" fill="currentColor" stroke="none"/><rect x="14" y="5" width="4" height="14" fill="currentColor" stroke="none"/></>,
    close: <><path d="M5 5 19 19M19 5 5 19"/></>,
  }
  const graphic = <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[icon]}</svg>
  return <BAIconButton id={id} title={title} aria-label={title} onClick={onClick} Type="Ghost" Size="Large" Enabled={true} icon={graphic} />
}
export function Surface({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={className} data-ba-component="Surface" data-ba-surface="default">{children}</div>
}
export function Select({ id, label, choices }: { id: string; label: string; choices: [string, string][] }) {
  return <label><span className="ds-type-label-micro">{label}</span><select id={id} defaultValue={choices[0][0]}>{choices.map(([value, text]) => <option value={value} key={value}>{text}</option>)}</select></label>
}
