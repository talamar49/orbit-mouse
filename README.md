# Orbit Mouse Studio

Orbit is an Electron + React mouse configuration studio with a capability-first device model. The first adapter targets the Logitech MX Master 4 over Bluetooth or Logi Bolt. Additional Logitech mice can be added through the versioned community driver API without changing the renderer or core registry.

## What is implemented

- Live Logitech/Logi Bolt HID discovery through `node-hid`
- A device-adapter registry that is independent of the renderer
- A reviewable, build-time community driver SDK and registry
- Driver-contributed settings pages; unsupported features do not appear in the UI
- Button and wheel assignments with an action library
- Independent press, double-press, and long-press actions on each supported discrete button
- Live HID++ `0x19B0` haptic intensity and test playback for the two verified waveforms
- Per-device settings persisted in Electron's user-data directory
- A tray-resident background service and KDE login autostart entry
- A browser-safe preview adapter for UI development

The current build persists assignments, captures diverted controls, executes global Linux actions through a persistent uinput helper, reads real battery state, and performs verified haptic writes. The UI never reports an unverified hardware write as successful.

## Add another Logitech mouse

See [`docs/community-drivers.md`](docs/community-drivers.md). Community drivers use a versioned API and are registered at build time so hardware access and permissions remain reviewable.

## Run

```bash
npm install
npm run dev
```

On Linux, Electron may require its normal SUID sandbox setup. For local development only, `ELECTRON_DISABLE_SANDBOX=1 npm run dev` bypasses it.

## Linux receiver access

Orbit needs read/write access to the HID++ endpoint, not just standard pointer input. Install the scoped rule and reconnect the Bolt receiver:

```bash
sudo install -m 0644 resources/60-orbit-logitech-bolt.rules /etc/udev/rules.d/60-orbit-logitech-bolt.rules
sudo udevadm control --reload-rules
sudo udevadm trigger --subsystem-match=hidraw
```

The rule matches the Bolt receiver product `046d:c548` and grants access to members of `plugdev`. It does not grant access to unrelated HID devices.

## Build

```bash
npm run build
```

Output is written to `out/` for the Electron main, preload, and renderer bundles.

## Hardware facts used

The MX Master 4 profile is based on Logitech's published specification: six programmable controls, a 200–8,000 DPI Darkfield sensor in 50 DPI increments, MagSpeed/SmartShift, thumb wheel, Easy-Switch, and a Haptic Sense panel. Haptics use HID++ feature `0x19B0`, whose verified waveforms are `DampStateChange` (`1`) and `SubtleCollision` (`4`). Logitech has not published that feature in the public HID++ specification, so Orbit treats its implementation as device-tested, reverse-engineered behavior.

Orbit is an independent project and is not affiliated with Logitech. Logitech, MX Master, Logi Bolt, and Options+ are trademarks of Logitech International S.A.

The MX Master 4 for Mac Space Black render in `src/renderer/src/assets` was supplied by the user from Logitech product media and remains © Logitech; it is included for product-identification UI prototyping and should be reviewed for distribution rights before publishing binaries.
