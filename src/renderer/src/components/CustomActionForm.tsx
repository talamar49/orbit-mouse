import { Keyboard, Radio } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { CustomActionDefinition } from '../../../shared/device'

interface CustomActionFormProps {
  initialAction?: CustomActionDefinition
  submitLabel: string
  onSubmit: (action: CustomActionDefinition) => void
}

const codeNames: Record<string, string> = {
  Space: 'SPACE', Enter: 'ENTER', Escape: 'ESC', Tab: 'TAB', Backspace: 'BACKSPACE',
  Delete: 'DELETE', Insert: 'INSERT', Home: 'HOME', End: 'END', PageUp: 'PAGEUP', PageDown: 'PAGEDOWN',
  ArrowLeft: 'LEFT', ArrowRight: 'RIGHT', ArrowUp: 'UP', ArrowDown: 'DOWN',
  PrintScreen: 'PRINT', Minus: 'MINUS', Equal: 'EQUAL', BracketLeft: 'LEFTBRACE', BracketRight: 'RIGHTBRACE',
  Semicolon: 'SEMICOLON', Quote: 'APOSTROPHE', Backquote: 'GRAVE', Backslash: 'BACKSLASH',
  Comma: 'COMMA', Period: 'DOT', Slash: 'SLASH'
}

function shortcutFromEvent(event: KeyboardEvent): string | null {
  const modifiers = [
    event.ctrlKey ? 'CTRL' : '', event.altKey ? 'ALT' : '',
    event.shiftKey ? 'SHIFT' : '', event.metaKey ? 'SUPER' : ''
  ].filter(Boolean)
  if (['ControlLeft', 'ControlRight', 'AltLeft', 'AltRight', 'ShiftLeft', 'ShiftRight', 'MetaLeft', 'MetaRight'].includes(event.code)) return null
  let key = codeNames[event.code]
  if (!key && /^Key[A-Z]$/.test(event.code)) key = event.code.slice(3)
  if (!key && /^Digit[0-9]$/.test(event.code)) key = event.code.slice(5)
  if (!key && /^F(?:[1-9]|1[0-2])$/.test(event.code)) key = event.code
  return key ? [...modifiers, key].join('+') : null
}

export function CustomActionForm({ initialAction, submitLabel, onSubmit }: CustomActionFormProps): React.JSX.Element {
  const [type, setType] = useState<'shortcut' | 'launch'>(initialAction?.type ?? 'shortcut')
  const [label, setLabel] = useState(initialAction?.label ?? '')
  const [shortcut, setShortcut] = useState(initialAction?.type === 'shortcut' ? initialAction.shortcut : '')
  const [executable, setExecutable] = useState(initialAction?.type === 'launch' ? initialAction.executable : '')
  const [argumentsText, setArgumentsText] = useState(initialAction?.type === 'launch' ? initialAction.args.join('\n') : '')
  const [recording, setRecording] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!recording) return
    const capture = (event: KeyboardEvent): void => {
      event.preventDefault()
      event.stopPropagation()
      const captured = shortcutFromEvent(event)
      if (!captured) return
      setShortcut(captured)
      setRecording(false)
      setError('')
    }
    window.addEventListener('keydown', capture, true)
    return () => window.removeEventListener('keydown', capture, true)
  }, [recording])

  const submit = (): void => {
    const trimmedLabel = label.trim()
    if (!trimmedLabel) {
      setError('Give this action a name.')
      return
    }
    const id = initialAction?.id ?? `custom-${crypto.randomUUID()}`
    const action: CustomActionDefinition = type === 'shortcut'
      ? { id, type, label: trimmedLabel, detail: shortcut.trim().toUpperCase(), shortcut: shortcut.trim().toUpperCase() }
      : {
          id, type, label: trimmedLabel, detail: executable.trim(), executable: executable.trim(),
          args: argumentsText.split('\n').map((argument) => argument.trim()).filter(Boolean)
        }
    if ((action.type === 'shortcut' && !action.shortcut) || (action.type === 'launch' && !action.executable)) {
      setError(action.type === 'shortcut' ? 'Record or enter a keyboard shortcut.' : 'Enter a program name or executable path.')
      return
    }
    onSubmit(action)
  }

  return (
    <form className="custom-action-form" onSubmit={(event) => { event.preventDefault(); submit() }}>
      <div className="action-type-switch" aria-label="Action type">
        <button className={type === 'shortcut' ? 'active' : ''} onClick={() => { setType('shortcut'); setRecording(false) }} type="button">Keyboard shortcut</button>
        <button className={type === 'launch' ? 'active' : ''} onClick={() => { setType('launch'); setRecording(false) }} type="button">Launch program</button>
      </div>
      <label className="form-field"><span>Name</span><input autoFocus value={label} onChange={(event) => setLabel(event.target.value)} placeholder="Open terminal" /></label>
      {type === 'shortcut' ? (
        <div className="form-field">
          <span>Shortcut</span>
          <div className={`shortcut-recorder ${recording ? 'recording' : ''}`}>
            <Keyboard size={17} />
            <input value={shortcut} onChange={(event) => setShortcut(event.target.value)} placeholder={recording ? 'Press your shortcut…' : 'CTRL+ALT+T'} aria-label="Keyboard shortcut" />
            <button onClick={() => setRecording((current) => !current)} type="button"><Radio size={14} />{recording ? 'Listening…' : 'Record'}</button>
          </div>
          <small>{recording ? 'Press the complete combination now.' : 'Click Record, then press the keys together. Manual entry is also supported.'}</small>
        </div>
      ) : (
        <>
          <label className="form-field"><span>Program or executable</span><input value={executable} onChange={(event) => setExecutable(event.target.value)} placeholder="firefox" /></label>
          <label className="form-field"><span>Arguments · one per line</span><textarea value={argumentsText} onChange={(event) => setArgumentsText(event.target.value)} placeholder="--new-window" /></label>
        </>
      )}
      {error && <p className="form-error">{error}</p>}
      <div className="form-footer"><span>Runs directly—no shell commands are evaluated.</span><button className="primary-button" type="submit">{submitLabel}</button></div>
    </form>
  )
}
