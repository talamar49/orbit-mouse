# Contributing to Orbit Mouse Studio

Thanks for helping make advanced peripherals work well on Linux.

## Before opening work

- Search existing issues and discussions first.
- Use a device request or hardware report for model-specific behavior.
- For large architecture or security changes, open an issue before implementation.
- Never claim a hardware write succeeded unless it was verified on the target device.

## Development setup

Install Node.js 22.12.0 or newer, npm, the `libusb-1.0` development package, and `libudev` development headers.

```bash
npm ci
npm run dev
```

Before opening a pull request:

```bash
npm run build
npm audit
```

## Community drivers

Read [`docs/community-drivers.md`](docs/community-drivers.md). Keep device matches narrow, verify identity before writes, restore diverted controls on close, and document the exact hardware and firmware used for testing.

## Pull requests

- Keep each pull request focused.
- Explain user-visible behavior and trust-boundary changes.
- Include screenshots for UI changes.
- Include distribution, kernel, connection mode, receiver IDs, and firmware for hardware changes.
- Mark behavior that was simulated or not hardware-tested.

By participating, you agree to follow the [Code of Conduct](CODE_OF_CONDUCT.md).
