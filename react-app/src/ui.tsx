import type { ReactNode } from "react"
import {
  Button as BAButton,
  IconButton as BAIconButton,
  InputField as BAInputField,
  Chip as BAChip,
  Selection as BASelection,
  ProgressBar as BAProgressBar,
  ProgressPie as BAProgressPie,
  ProgressDonut as BAProgressDonut,
  Loader as BALoader,
  Loaders as BALoaders,
  SegmentedChild as BASegmentedChild,
  StepperChild as BAStepperChild,
  SegmentedProgress as BASegmentedProgress,
  Stepper as BAStepper,
} from "@ba-design-system/react"

export const Field = BAInputField
export const StatusChip = BAChip
export const Choice = BASelection
export const ProgressBar = BAProgressBar
export const ProgressPie = BAProgressPie
export const ProgressDonut = BAProgressDonut
export const Loader = BALoader
export const Loaders = BALoaders
export const SegmentedChild = BASegmentedChild
export const StepperChild = BAStepperChild
export const SegmentedProgress = BASegmentedProgress
export const Stepper = BAStepper

export function Action({ children, id, className, kind = "ghost", size = "small", enabled = true, title, onClick, ...rest }: { children: ReactNode; id?: string; className?: string; kind?: "primary" | "ghost" | "default"; size?: "small" | "large"; enabled?: boolean; title?: string; onClick?: () => void; "data-mode"?: string }) {
  return <BAButton id={id} className={className} title={title} onClick={onClick} {...rest} Type={kind === "primary" ? "Primary" : kind === "default" ? "Default" : "Ghost"} Size={size === "large" ? "Large" : "Small"} Enabled={enabled} {...{ "Leading Icon": false, "Tailing Icon": false }}>{children}</BAButton>
}
export function IconAction({ icon, id, kind = "ghost", size = "large", enabled = true, title, onClick }: { icon: string; id?: string; kind?: "primary" | "ghost" | "default"; size?: "small" | "large"; enabled?: boolean; title: string; onClick?: () => void }) {
  return <BAIconButton id={id} title={title} aria-label={title} onClick={onClick} Type={kind === "primary" ? "Primary" : kind === "default" ? "Default" : "Ghost"} Size={size === "small" ? "Small" : "Large"} Enabled={enabled} icon={icon} />
}
export function Surface({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={className} data-ba-component="Surface" data-ba-surface="default">{children}</div>
}
export function Select({ id, label, choices, defaultValue }: { id: string; label: string; choices: [string, string][]; defaultValue?: string }) {
  return <label><span className="section-kicker">{label}</span><select id={id} defaultValue={defaultValue ?? choices[0][0]}>{choices.map(([value, text]) => <option value={value} key={value}>{text}</option>)}</select></label>
}
