import {
  AppWindow,
  ArrowLeftRight,
  AudioLines,
  CircleDot,
  Clipboard,
  Copy,
  Keyboard,
  LayoutGrid,
  MonitorUp,
  MousePointer2,
  Puzzle,
  Search,
  Sparkles,
  ZoomIn
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { CustomActionDefinition, DeviceActionDefinition } from '../../../shared/device'

export interface ActionOption {
  id: string
  label: string
  detail: string
  icon: LucideIcon
  category: string
}

export const actions: ActionOption[] = [
  { id: 'middle-click', label: 'Middle click', detail: 'Open links and pan', icon: CircleDot, category: 'Mouse' },
  { id: 'wheel-mode', label: 'Shift wheel mode', detail: 'Ratchet ↔ free-spin', icon: MousePointer2, category: 'Mouse' },
  { id: 'back', label: 'Back', detail: 'Previous page', icon: ArrowLeftRight, category: 'Navigation' },
  { id: 'forward', label: 'Forward', detail: 'Next page', icon: ArrowLeftRight, category: 'Navigation' },
  { id: 'mission-control', label: 'Workspace view', detail: 'See every open window', icon: LayoutGrid, category: 'System' },
  { id: 'action-ring', label: 'Action ring', detail: 'Eight quick actions', icon: Sparkles, category: 'Orbit' },
  { id: 'horizontal-scroll', label: 'Horizontal scroll', detail: 'Pan left and right', icon: ArrowLeftRight, category: 'Mouse' },
  { id: 'app-switcher', label: 'Switch applications', detail: 'Jump between open apps', icon: AppWindow, category: 'System' },
  { id: 'screen-capture', label: 'Screen capture', detail: 'Select an area to capture', icon: MonitorUp, category: 'System' },
  { id: 'copy', label: 'Copy', detail: 'Copy selection', icon: Copy, category: 'Keyboard' },
  { id: 'paste', label: 'Paste', detail: 'Paste from clipboard', icon: Clipboard, category: 'Keyboard' },
  { id: 'spotlight', label: 'Quick search', detail: 'Search apps and files', icon: Search, category: 'System' },
  { id: 'volume', label: 'Mute audio', detail: 'Mute or unmute system audio', icon: AudioLines, category: 'Media' },
  { id: 'zoom', label: 'Zoom in', detail: 'Increase the current zoom level', icon: ZoomIn, category: 'Creative' }
]

export function customActionOption(action: CustomActionDefinition): ActionOption {
  return {
    id: action.id,
    label: action.label,
    detail: action.detail,
    icon: action.type === 'shortcut' ? Keyboard : AppWindow,
    category: 'Custom'
  }
}

export function driverActionOption(action: DeviceActionDefinition): ActionOption {
  return { ...action, icon: Puzzle, category: action.category ?? 'Device driver' }
}

export function findActionOption(actionId: string, customActions: readonly CustomActionDefinition[]): ActionOption | undefined {
  return actions.find((action) => action.id === actionId) ??
    customActions.map(customActionOption).find((action) => action.id === actionId)
}
