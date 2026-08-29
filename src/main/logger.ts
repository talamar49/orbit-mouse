import { app } from 'electron'
import { appendFile, mkdir } from 'node:fs/promises'
import { join } from 'node:path'

export function log(event: string, details: Record<string, unknown> = {}): void {
  const entry = JSON.stringify({ time: new Date().toISOString(), event, ...details })
  console.log(`[orbit] ${entry}`)
  if (!app.isReady()) return
  const directory = join(app.getPath('userData'), 'logs')
  void mkdir(directory, { recursive: true })
    .then(() => appendFile(join(directory, 'orbit.log'), `${entry}\n`, 'utf8'))
    .catch(() => undefined)
}
