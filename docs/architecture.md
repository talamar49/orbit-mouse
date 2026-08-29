# Architecture

## Separation of concerns

```text
React renderer
  └─ typed preload bridge
      └─ device registry
          ├─ Logitech HID++ adapter
          ├─ future vendor adapter
          └─ future generic HID adapter
```

The renderer consumes `DeviceSnapshot` and `DeviceCapability` values only. It does not inspect product IDs, build HID packets, or assume that every mouse has haptics, SmartShift, a thumb wheel, or the same number of controls.

Visual device definitions are separate from hardware transport. A portable
manifest owns the product image, percentage-based control markers, trigger
support, default action IDs, settings schema, and action declarations. A
reviewed adapter later connects those stable IDs to real HID events. This lets
community authors design and share the complete UI contract before hardware
I/O is implemented without pretending the device is functional.

Each hardware family implements `DeviceAdapter`:

- `discover()` identifies devices and advertises capabilities.
- `saveSettings()` translates generic settings into vendor/device operations.
- `playHaptic()` exposes supported waveform playback.

The registry maps each discovered device to the adapter that owns it. Adding a future mouse therefore means adding one adapter and a device definition, then registering it—existing renderer screens can render capability presence or absence.

## Hardware and OS services still required

Button remapping is not the same as changing a stored HID setting. A complete cross-platform implementation needs a small privileged/background service to divert reprogrammable control events and inject the selected OS action:

- Linux: HID++ control diversion plus `uinput`, with a narrow udev rule.
- macOS: an input-monitoring/accessibility helper and IOKit HID transport.
- Windows: Raw Input or a low-level mouse hook, SendInput, and HID transport.

For Logitech MX mice, the important HID++ features are dynamic rather than fixed packet slots: root feature discovery, reprogrammable controls v4, adjustable DPI, SmartShift/wheel mode, battery status, and haptic feedback. The adapter must enumerate the device's feature table before writing. This is why Orbit currently validates the writable endpoint but refuses to emit guessed feature-index packets.

## Storage

The UI uses a versioned local-storage key for instant state restoration. Electron additionally writes a per-device JSON document beneath its `userData/devices` directory. A later background service can watch or receive this normalized configuration without coupling persistence to one mouse model.
