#!/usr/bin/env bash
set -euo pipefail

if [[ ${EUID} -ne 0 ]]; then
  echo "Run this installer as root: sudo bash $0" >&2
  exit 1
fi

if ! getent group plugdev >/dev/null; then
  groupadd --system plugdev
fi

install -d -m 0755 /etc/udev/rules.d

printf '%s\n' \
  '# Orbit Mouse Studio — scoped HID++ access for Logitech MX devices.' \
  '# Bolt USB receiver.' \
  'SUBSYSTEM=="hidraw", KERNEL=="hidraw*", ATTRS{idVendor}=="046d", ATTRS{idProduct}=="c548", MODE="0660", GROUP="plugdev", TAG+="uaccess"' \
  '# Direct Logitech Bluetooth hidraw endpoints (Bluetooth bus 0005).' \
  'SUBSYSTEM=="hidraw", KERNEL=="hidraw*", KERNELS=="0005:046D:*", MODE="0660", GROUP="plugdev", TAG+="uaccess"' \
  > /etc/udev/rules.d/60-orbit-logitech-bolt.rules

printf '%s\n' \
  '# Orbit virtual keyboard/mouse output. Scoped to the local plugdev group.' \
  'KERNEL=="uinput", GROUP="plugdev", MODE="0660", OPTIONS+="static_node=uinput", TAG+="uaccess"' \
  > /etc/udev/rules.d/61-orbit-uinput.rules

chmod 0644 /etc/udev/rules.d/60-orbit-logitech-bolt.rules /etc/udev/rules.d/61-orbit-uinput.rules

if [[ -n ${SUDO_USER:-} && ${SUDO_USER} != root ]]; then
  usermod -aG plugdev "${SUDO_USER}"
fi

modprobe uinput 2>/dev/null || true
udevadm control --reload-rules
udevadm trigger --subsystem-match=hidraw
udevadm trigger --name-match=uinput 2>/dev/null || true

echo "Orbit permissions installed. Reconnect the mouse or Bolt receiver."
if [[ -n ${SUDO_USER:-} && ${SUDO_USER} != root ]]; then
  echo "Log out and back in once if ${SUDO_USER} was not already a member of plugdev."
fi
