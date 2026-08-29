import { Keyboard, Radio } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
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
  Comma: 'COMMA', Period: 'DOT', Slash: 'SLASH', CapsLock: 'CAPSLOCK', ContextMenu: 'MENU',
  ScrollLock: 'SCROLLLOCK', Pause: 'PAUSE', NumLock: 'NUMLOCK', NumpadAdd: 'KPPLUS',
  NumpadSubtract: 'KPMINUS', NumpadMultiply: 'KPASTERISK', NumpadDivide: 'KPSLASH',
  NumpadDecimal: 'KPDOT', NumpadComma: 'KPCOMMA', NumpadEnter: 'KPENTER', NumpadEqual: 'KPEQUAL',
  AudioVolumeMute: 'MUTE', AudioVolumeUp: 'VOLUMEUP', AudioVolumeDown: 'VOLUMEDOWN',
  MediaPlayPause: 'PLAYPAUSE', MediaStop: 'STOPCD', MediaTrackNext: 'NEXTSONG', MediaTrackPrevious: 'PREVIOUSSONG',
  MediaSelect: 'MEDIA', Eject: 'EJECTCD', BrowserBack: 'BACK', BrowserForward: 'FORWARD',
  BrowserRefresh: 'REFRESH', BrowserStop: 'STOP', BrowserSearch: 'SEARCH', BrowserFavorites: 'FAVORITES',
  BrowserHome: 'HOMEPAGE', LaunchMail: 'MAIL', LaunchApp1: 'PROG1', LaunchApp2: 'PROG2',
  Power: 'POWER', Sleep: 'SLEEP', WakeUp: 'WAKEUP', IntlBackslash: '102ND', IntlRo: 'RO', IntlYen: 'YEN',
  Convert: 'HENKAN', NonConvert: 'MUHENKAN', KanaMode: 'KATAKANAHIRAGANA', Lang1: 'HANGEUL', Lang2: 'HANJA',
  Undo: 'UNDO', Cut: 'CUT', Copy: 'COPY', Paste: 'PASTE', Find: 'FIND', Open: 'OPEN', Help: 'HELP',
  Select: 'SELECT', Again: 'AGAIN', Props: 'PROPS'
}

const keyNames: Record<string, string> = {
  ' ': 'SPACE', Enter: 'ENTER', Escape: 'ESC', Esc: 'ESC', Tab: 'TAB', Backspace: 'BACKSPACE',
  Delete: 'DELETE', Insert: 'INSERT', Home: 'HOME', End: 'END', PageUp: 'PAGEUP', PageDown: 'PAGEDOWN',
  ArrowLeft: 'LEFT', ArrowRight: 'RIGHT', ArrowUp: 'UP', ArrowDown: 'DOWN', PrintScreen: 'PRINT',
  '-': 'MINUS', '_': 'MINUS', '=': 'EQUAL', '+': 'EQUAL', '[': 'LEFTBRACE', '{': 'LEFTBRACE',
  ']': 'RIGHTBRACE', '}': 'RIGHTBRACE', ';': 'SEMICOLON', ':': 'SEMICOLON', "'": 'APOSTROPHE',
  '"': 'APOSTROPHE', '`': 'GRAVE', '~': 'GRAVE', '\\': 'BACKSLASH', '|': 'BACKSLASH',
  ',': 'COMMA', '<': 'COMMA', '.': 'DOT', '>': 'DOT', '/': 'SLASH', '?': 'SLASH',
  CapsLock: 'CAPSLOCK', NumLock: 'NUMLOCK', ScrollLock: 'SCROLLLOCK', Pause: 'PAUSE',
  ContextMenu: 'MENU', AudioVolumeMute: 'MUTE', AudioVolumeUp: 'VOLUMEUP', AudioVolumeDown: 'VOLUMEDOWN',
  MediaPlayPause: 'PLAYPAUSE', MediaStop: 'STOPCD', MediaTrackNext: 'NEXTSONG', MediaTrackPrevious: 'PREVIOUSSONG'
}

const modifierOrder = ['CTRL', 'ALT', 'SHIFT', 'SUPER']

function pureModifierName(event: KeyboardEvent): string | null {
  if (event.key === 'Control' || event.code === 'ControlLeft' || event.code === 'ControlRight') return 'CTRL'
  if (event.key === 'Alt' || event.key === 'AltGraph' || event.code === 'AltLeft' || event.code === 'AltRight') return 'ALT'
  if (event.key === 'Shift' || event.code === 'ShiftLeft' || event.code === 'ShiftRight') return 'SHIFT'
  if (event.key === 'Meta' || event.key === 'Super' || event.key === 'OS' || ['MetaLeft', 'MetaRight', 'OSLeft', 'OSRight'].includes(event.code)) return 'SUPER'
  return null
}

function modifierNames(event: KeyboardEvent, held: ReadonlySet<string> = new Set()): string[] {
  const modifiers = new Set(held)
  if (event.ctrlKey) modifiers.add('CTRL')
  if (event.altKey) modifiers.add('ALT')
  if (event.shiftKey) modifiers.add('SHIFT')
  if (event.metaKey) modifiers.add('SUPER')
  const direct = pureModifierName(event)
  if (direct) modifiers.add(direct)
  return modifierOrder.filter((modifier) => modifiers.has(modifier))
}

function keyName(event: KeyboardEvent): string | null {
  let key = codeNames[event.code]
  if (!key && /^Key[A-Z]$/.test(event.code)) key = event.code.slice(3)
  if (!key && /^Digit[0-9]$/.test(event.code)) key = event.code.slice(5)
  if (!key && /^Numpad[0-9]$/.test(event.code)) key = `KP${event.code.slice(6)}`
  if (!key && /^F(?:[1-9]|1[0-9]|2[0-4])$/.test(event.code)) key = event.code
  if (!key) key = keyNames[event.key]
  if (!key && /^[a-z0-9]$/i.test(event.key)) key = event.key.toUpperCase()
  if (!key && /^F(?:[1-9]|1[0-9]|2[0-4])$/i.test(event.key)) key = event.key.toUpperCase()
  if (!key && event.code !== 'Unidentified' && /^[A-Za-z][A-Za-z0-9]+$/.test(event.code)) key = event.code.toUpperCase()
  return key ?? null
}

function shortcutFromEvent(event: KeyboardEvent, held: ReadonlySet<string>): string | null {
  if (pureModifierName(event)) return null
  const key = keyName(event)
  return key ? [...modifierNames(event, held), key].join('+') : null
}

export function CustomActionForm({ initialAction, submitLabel, onSubmit }: CustomActionFormProps): React.JSX.Element {
  const [type, setType] = useState<'shortcut' | 'launch'>(initialAction?.type ?? 'shortcut')
  const [label, setLabel] = useState(initialAction?.label ?? '')
  const [shortcut, setShortcut] = useState(initialAction?.type === 'shortcut' ? initialAction.shortcut : '')
  const [executable, setExecutable] = useState(initialAction?.type === 'launch' ? initialAction.executable : '')
  const [argumentsText, setArgumentsText] = useState(initialAction?.type === 'launch' ? initialAction.args.join('\n') : '')
  const [recording, setRecording] = useState(false)
  const [recordingPreview, setRecordingPreview] = useState('')
  const [error, setError] = useState('')
  const recordButton = useRef<HTMLButtonElement>(null)
  const heldModifiers = useRef(new Set<string>())

  useEffect(() => {
    if (!recording) return
    const capture = (event: KeyboardEvent): void => {
      event.preventDefault()
      event.stopPropagation()
      const directModifier = pureModifierName(event)
      if (directModifier) {
        heldModifiers.current.add(directModifier)
        setRecordingPreview(modifierOrder.filter((modifier) => heldModifiers.current.has(modifier)).join('+') + '+…')
        setError('')
        return
      }
      const captured = shortcutFromEvent(event, heldModifiers.current)
      if (!captured) {
        const modifiers = modifierNames(event, heldModifiers.current)
        if (modifiers.length) setRecordingPreview(modifiers.join('+') + '+…')
        else setError(`Orbit could not recognize “${event.key || event.code}”. Try another key.`)
        return
      }
      setShortcut(captured)
      setRecordingPreview('')
      setRecording(false)
      setError('')
    }
    const release = (event: KeyboardEvent): void => {
      const directModifier = pureModifierName(event)
      if (!directModifier || !heldModifiers.current.has(directModifier)) return
      event.preventDefault()
      event.stopPropagation()
      const modifierChord = modifierOrder.filter((modifier) => heldModifiers.current.has(modifier)).join('+')
      heldModifiers.current.clear()
      setShortcut(modifierChord)
      setRecordingPreview('')
      setRecording(false)
      setError('')
    }
    window.addEventListener('keydown', capture, true)
    window.addEventListener('keyup', release, true)
    return () => {
      window.removeEventListener('keydown', capture, true)
      window.removeEventListener('keyup', release, true)
      heldModifiers.current.clear()
    }
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
            <input value={recording && recordingPreview ? recordingPreview : shortcut} onChange={(event) => setShortcut(event.target.value)} placeholder={recording ? 'Press your shortcut…' : 'CTRL+SHIFT+K'} aria-label="Keyboard shortcut" readOnly={recording} />
            <button
              ref={recordButton}
              onClick={() => {
                setRecording((current) => {
                  const next = !current
                  if (next) {
                    heldModifiers.current.clear()
                    setRecordingPreview('')
                    setError('')
                    window.setTimeout(() => recordButton.current?.focus(), 0)
                  }
                  return next
                })
              }}
              type="button"
            ><Radio size={14} />{recording ? 'Listening…' : 'Record'}</button>
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
