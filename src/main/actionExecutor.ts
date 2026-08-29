import { app } from 'electron'
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process'
import { createInterface } from 'node:readline'
import { join } from 'node:path'
import type { CustomActionDefinition } from '../shared/device'

export interface ActionResult {
  ok: boolean
  message?: string
}

interface PendingAction {
  resolve: (result: ActionResult) => void
}

function helperPath(): string {
  return app.isPackaged
    ? join(process.resourcesPath, 'input_helper.py')
    : join(app.getAppPath(), 'resources', 'input_helper.py')
}

export class ActionExecutor {
  private helper?: ChildProcessWithoutNullStreams
  private starting?: Promise<ActionResult>
  private pending: PendingAction[] = []

  start(): Promise<ActionResult> {
    if (this.helper) return Promise.resolve({ ok: true })
    if (this.starting) return this.starting

    this.starting = new Promise<ActionResult>((resolve) => {
      const child = spawn('python3', [helperPath(), 'serve'], { stdio: ['pipe', 'pipe', 'pipe'] })
      const lines = createInterface({ input: child.stdout })
      let startupError = ''
      let ready = false

      child.stderr.on('data', (chunk) => { startupError += String(chunk) })
      lines.on('line', (line) => {
        if (!ready && line === 'ready') {
          ready = true
          this.helper = child
          resolve({ ok: true })
          return
        }
        const action = this.pending.shift()
        if (!action) return
        action.resolve(line === 'ok' ? { ok: true } : { ok: false, message: line.replace(/^error:/, '') })
      })
      child.once('error', (error) => {
        if (!ready) resolve({ ok: false, message: error.message })
      })
      child.once('exit', (code) => {
        if (!ready) resolve({ ok: false, message: startupError.trim() || `Input helper exited with code ${code}.` })
        while (this.pending.length) this.pending.shift()?.resolve({ ok: false, message: 'Input helper stopped.' })
        if (this.helper === child) this.helper = undefined
        this.starting = undefined
      })
    })
    return this.starting
  }

  async execute(actionId: string, customAction?: CustomActionDefinition): Promise<ActionResult> {
    if (actionId === 'action-ring') return { ok: false, message: 'Action Ring is handled by the overlay.' }
    if (actionId === 'horizontal-scroll' || actionId === 'wheel-mode' || actionId === 'keystroke') {
      return { ok: false, message: `${actionId} is not an injectable button action.` }
    }

    if (customAction?.type === 'launch') {
      return new Promise<ActionResult>((resolve) => {
        const child = spawn(customAction.executable, customAction.args, { detached: true, stdio: 'ignore', shell: false })
        child.once('spawn', () => {
          child.unref()
          resolve({ ok: true })
        })
        child.once('error', (error) => resolve({ ok: false, message: error.message }))
      })
    }

    const started = await this.start()
    if (!started.ok || !this.helper) return started
    return new Promise<ActionResult>((resolve) => {
      this.pending.push({ resolve })
      const request = customAction?.type === 'shortcut'
        ? JSON.stringify({ type: 'shortcut', shortcut: customAction.shortcut })
        : actionId
      this.helper?.stdin.write(`${request}\n`)
    })
  }

  check(): Promise<ActionResult> {
    return this.start()
  }

  close(): void {
    this.helper?.stdin.end()
    this.helper = undefined
  }
}
