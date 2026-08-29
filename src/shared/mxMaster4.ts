import type { DeviceCapability, DeviceSettings, DeviceSettingsSection } from './device'

export const MX_MASTER_4_CAPABILITIES: DeviceCapability[] = [
  { id: 'buttons', label: '6 programmable controls', writable: true },
  { id: 'haptics', label: 'Haptic Sense panel', writable: true },
  { id: 'battery', label: 'Battery telemetry', writable: false }
]

export const MX_MASTER_4_SETTINGS_SECTIONS: DeviceSettingsSection[] = [
  {
    id: 'assignments',
    label: 'Buttons',
    icon: 'buttons',
    kind: 'assignments',
    title: 'Configure controls',
    description: 'Select a marker on the mouse to change its action.'
  },
  {
    id: 'device-settings',
    label: 'Device settings',
    icon: 'settings',
    kind: 'settings',
    title: 'MX Master 4 settings',
    description: 'Features provided specifically by the installed MX Master 4 driver.',
    fields: [
      { type: 'toggle', key: 'hapticsEnabled', label: 'Haptic feedback' },
      { type: 'range', key: 'hapticIntensity', label: 'Intensity', min: 0, max: 100, step: 1, suffix: '%' }
    ],
    commands: [
      { id: 'haptic.soft-boundary', label: 'Soft boundary', description: 'Subtle collision waveform' },
      { id: 'haptic.firm-confirmation', label: 'Firm confirmation', description: 'Damp state-change waveform' }
    ]
  }
]

export const DEFAULT_SETTINGS: DeviceSettings = {
  dpi: 1000,
  pointerSpeed: 54,
  naturalScroll: false,
  smartShift: true,
  smartShiftThreshold: 62,
  scrollForce: 46,
  thumbWheelSpeed: 50,
  thumbWheelDirection: 'standard',
  hapticsEnabled: true,
  hapticIntensity: 60,
  batterySaver: true,
  driver: {},
  customActions: [],
  bindings: [
    { controlId: 'middle', actionId: 'middle-click', label: 'Middle click', detail: 'Open links and pan', trigger: 'press' },
    { controlId: 'mode-shift', actionId: 'wheel-mode', label: 'Shift wheel mode', detail: 'Ratchet ↔ free-spin', trigger: 'press' },
    { controlId: 'back', actionId: 'back', label: 'Back', detail: 'Previous page', trigger: 'press' },
    { controlId: 'forward', actionId: 'forward', label: 'Forward', detail: 'Next page', trigger: 'press' },
    { controlId: 'gesture', actionId: 'mission-control', label: 'Workspace view', detail: 'Hold for gestures', trigger: 'press' },
    { controlId: 'haptic-panel', actionId: 'action-ring', label: 'Action ring', detail: 'Eight quick actions', trigger: 'press' },
    { controlId: 'thumbwheel', actionId: 'horizontal-scroll', label: 'Horizontal scroll', detail: 'Pan left and right', trigger: 'press' }
  ]
}
