# Community device drivers

Orbit's hardware layer is not tied to the MX Master 4. That mouse is the first
core driver; additional Logitech mice and keyboards can be contributed through the
versioned community driver API.

## Driver contract

A driver owns hardware discovery and I/O. It returns device snapshots to the
shared UI, applies settings, optionally exposes device commands such as
haptics, and emits physical controls through the supplied context. It must never report a capability as
writable unless the implementation has verified the corresponding hardware
write.

```ts
import { defineCommunityDriver, ORBIT_DRIVER_API_VERSION } from '../hardware/communitySdk'
import { MyLogitechAdapter } from './my-logitech-adapter'

export default defineCommunityDriver({
  apiVersion: ORBIT_DRIVER_API_VERSION,
  id: 'community.logitech.my-mouse',
  name: 'My Logitech mouse driver',
  supportedModels: ['Logitech My Mouse'],
  deviceKinds: ['mouse'],
  create: ({ emitControl }) => new MyLogitechAdapter(emitControl)
})
```

Add the exported definition to `src/main/community-drivers/index.ts`. Orbit's
registry will discover it alongside core drivers. Every snapshot supplies its
own `settingsSections`, so a mouse without haptics never receives a Haptics tab.
Use `settingDefaults` for driver-owned values and implement `runCommand` for
hardware tests or one-shot operations exposed by those sections.

Control events must include both phases:

```ts
emitControl({ controlId: 'back', cid: 0x0053, phase: 'down' })
emitControl({ controlId: 'back', cid: 0x0053, phase: 'up' })
```

Orbit resolves press, double-press, and long-press centrally. Drivers should
emit raw transitions promptly and must not implement their own timing logic.
Control IDs are open strings, so a keyboard driver can expose IDs such as
`key-g1` without changing Orbit core. A device snapshot sets `kind` to either
`mouse` or `keyboard`; its own settings sections determine what the UI shows.

## Requirements for contributions

- Use a globally unique driver ID such as `community.github-user.model`.
- Match only the intended Logitech vendor/product IDs and HID usage pages.
- Keep udev permissions scoped to those exact devices.
- Verify device identity before writing or diverting controls.
- Restore diverted controls when the adapter closes.
- Emit one `down` and one `up` transition for every diverted button press.
- Contribute only settings sections the device actually supports.
- Return real telemetry or `null`; never invent battery or firmware values.
- Document tested connection modes and hardware revisions.
- Include transport-level tests or captured protocol fixtures where possible.

Drivers are registered at build time so their source and hardware permissions
can be reviewed. A future community catalog can distribute reviewed driver
packages without turning the desktop app into an arbitrary-code downloader.
