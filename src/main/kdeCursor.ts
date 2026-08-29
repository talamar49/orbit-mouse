import { execFileSync } from 'node:child_process'
import type { Point } from 'electron'

const SCRIPT_NAME = 'orbit-cursor-position'
const CURSOR_LINE = /ORBIT_CURSOR\s+(\d+)\s+(-?\d+)\s+(-?\d+)/g

function qdbus(args: string[]): void {
  execFileSync('qdbus6', args, { stdio: 'ignore', timeout: 180 })
}

export function getKdeCursorPosition(scriptPath: string): Point | undefined {
  if (process.platform !== 'linux' || !process.env.KDE_FULL_SESSION) return undefined

  try {
    try {
      qdbus(['org.kde.KWin', '/Scripting', 'org.kde.kwin.Scripting.unloadScript', SCRIPT_NAME])
    } catch {
      // The script is normally absent before the first query.
    }
    qdbus(['org.kde.KWin', '/Scripting', 'org.kde.kwin.Scripting.loadScript', scriptPath, SCRIPT_NAME])
    qdbus(['org.kde.KWin', '/Scripting', 'org.kde.kwin.Scripting.start'])

    const journal = execFileSync(
      'journalctl',
      ['--user', '-n', '40', '--no-pager', '-o', 'cat'],
      { encoding: 'utf8', timeout: 180, maxBuffer: 64 * 1024 }
    )
    const matches = [...journal.matchAll(CURSOR_LINE)]
    const latest = matches.at(-1)
    if (!latest || Date.now() - Number(latest[1]) > 1500) return undefined
    return { x: Number(latest[2]), y: Number(latest[3]) }
  } catch {
    return undefined
  } finally {
    try {
      qdbus(['org.kde.KWin', '/Scripting', 'org.kde.kwin.Scripting.unloadScript', SCRIPT_NAME])
    } catch {
      // KWin may be shutting down.
    }
  }
}
