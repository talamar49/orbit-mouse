#!/usr/bin/env python3
"""Small uinput bridge for Orbit's Linux action executor.

Reads one action name from argv, creates a short-lived virtual input device,
emits the requested key/button chord, and exits. It never reads physical input.
"""

import json
import re
import sys
import time
from evdev import UInput, ecodes as e


KEYS = [
    e.KEY_LEFTALT, e.KEY_LEFTCTRL, e.KEY_LEFTSHIFT, e.KEY_LEFTMETA,
    e.KEY_LEFT, e.KEY_RIGHT, e.KEY_TAB, e.KEY_C, e.KEY_V, e.KEY_W,
    e.KEY_PRINT, e.KEY_EQUAL, e.KEY_KPPLUS, e.KEY_MUTE,
    e.BTN_MIDDLE,
]

# Linux accepts every key bit from 1 through KEY_MAX. KEY_CNT is a sentinel one
# past that range and must never be advertised (it causes uinput EINVAL).
KEYS = list(range(1, e.KEY_MAX + 1))

SHORTCUT_ALIASES = {
    "CTRL": "LEFTCTRL", "CONTROL": "LEFTCTRL",
    "ALT": "LEFTALT", "OPTION": "LEFTALT",
    "SHIFT": "LEFTSHIFT",
    "SUPER": "LEFTMETA", "META": "LEFTMETA", "WIN": "LEFTMETA", "CMD": "LEFTMETA",
    "ESC": "ESC", "ESCAPE": "ESC", "ENTER": "ENTER", "RETURN": "ENTER",
    "SPACE": "SPACE", "TAB": "TAB", "BACKSPACE": "BACKSPACE", "DELETE": "DELETE",
    "LEFT": "LEFT", "RIGHT": "RIGHT", "UP": "UP", "DOWN": "DOWN",
    "PRINTSCREEN": "PRINT", "PRINT": "PRINT",
}


def chord(ui: UInput, keys: list[int]) -> None:
    for key in keys:
        ui.write(e.EV_KEY, key, 1)
    ui.syn()
    time.sleep(0.012)
    for key in reversed(keys):
        ui.write(e.EV_KEY, key, 0)
    ui.syn()


def action_keys(action: str) -> list[int] | None:
    actions = {
        "back": [e.KEY_LEFTALT, e.KEY_LEFT],
        "forward": [e.KEY_LEFTALT, e.KEY_RIGHT],
        "middle-click": [e.BTN_MIDDLE],
        "mission-control": [e.KEY_LEFTMETA, e.KEY_W],
        "app-switcher": [e.KEY_LEFTALT, e.KEY_TAB],
        "screen-capture": [e.KEY_PRINT],
        "copy": [e.KEY_LEFTCTRL, e.KEY_C],
        "paste": [e.KEY_LEFTCTRL, e.KEY_V],
        "spotlight": [e.KEY_LEFTMETA],
        "zoom": [e.KEY_LEFTCTRL, e.KEY_EQUAL],
        "volume": [e.KEY_MUTE],
    }
    return actions.get(action)


def shortcut_keys(shortcut: str) -> list[int] | None:
    parts = [part.strip().upper() for part in shortcut.split("+") if part.strip()]
    if not parts or len(parts) > 8:
        return None
    result: list[int] = []
    for part in parts:
        normalized = SHORTCUT_ALIASES.get(part, part)
        if len(normalized) == 1 and re.fullmatch(r"[A-Z0-9]", normalized):
            normalized = normalized
        elif re.fullmatch(r"F(?:[1-9]|1[0-2])", normalized):
            normalized = normalized
        elif not re.fullmatch(r"[A-Z0-9_]+", normalized):
            return None
        if normalized.startswith("KEY_"):
            normalized = normalized[4:]
        code = e.ecodes.get(f"KEY_{normalized}")
        if not isinstance(code, int):
            return None
        result.append(code)
    return result


def request_keys(requested: str) -> list[int] | None:
    if requested.startswith("{"):
        try:
            request = json.loads(requested)
        except json.JSONDecodeError:
            return None
        if request.get("type") == "shortcut" and isinstance(request.get("shortcut"), str):
            return shortcut_keys(request["shortcut"])
        return None
    return action_keys(requested)


def main() -> int:
    action = sys.argv[1] if len(sys.argv) > 1 else "check"
    if action == "check":
        with UInput({e.EV_KEY: KEYS}, name="Orbit Virtual Controls"):
            return 0

    if action == "serve":
        with UInput({e.EV_KEY: KEYS}, name="Orbit Virtual Controls") as ui:
            print("ready", flush=True)
            for line in sys.stdin:
                requested = line.strip()
                keys = request_keys(requested)
                if not keys:
                    print(f"error:unsupported action: {requested}", flush=True)
                    continue
                chord(ui, keys)
                print("ok", flush=True)
        return 0

    keys = action_keys(action)
    if not keys:
        print(f"unsupported action: {action}", file=sys.stderr)
        return 2

    with UInput({e.EV_KEY: KEYS}, name="Orbit Virtual Controls") as ui:
        chord(ui, keys)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
