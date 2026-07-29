import { useEffect, useState, type FormEvent } from 'react'
import { AlertTriangle, Link2, X } from 'lucide-react'
import type { BookmarkNode, EditorIntent } from '../types'

interface EditorModalProps {
  intent: EditorIntent
  onClose: () => void
  onSave: (title: string, url?: string) => Promise<void>
}

export function EditorModal({ intent, onClose, onSave }: EditorModalProps) {
  const isBookmark = intent.kind === 'bookmark'
  const [title, setTitle] = useState(intent.node?.title ?? '')
  const [url, setUrl] = useState(intent.node?.url ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => event.key === 'Escape' && !saving && onClose()
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [onClose, saving])

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!title.trim()) return setError('Please add a name.')
    if (isBookmark && !url.trim()) return setError('Please add a URL.')
    setSaving(true)
    setError('')
    try {
      await onSave(title, isBookmark ? url : undefined)
      onClose()
    } catch {
      setError('That change could not be saved. Please try again.')
      setSaving(false)
    }
  }

  const verb = intent.node ? 'Edit' : 'New'

  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={() => { if (!saving) onClose() }}>
      <section className="ui-dialog editor-dialog" role="dialog" aria-modal="true" aria-labelledby="editor-title" onMouseDown={(event) => event.stopPropagation()}>
        <header className="dialog-header">
          <div>
            <span className="dialog-kicker">{verb}</span>
            <h2 id="editor-title">{isBookmark ? 'Bookmark' : 'Folder'}</h2>
          </div>
          <button className="ui-icon-button dialog-close" onClick={onClose} aria-label="Close dialog" disabled={saving}><X size={18} /></button>
        </header>
        <form onSubmit={submit}>
          <label className="field-label" htmlFor="item-title">Name</label>
          <input
            id="item-title"
            className="ui-input"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder={isBookmark ? 'Design handbook' : 'Inspiration'}
            autoFocus
          />
          {isBookmark && (
            <>
              <label className="field-label" htmlFor="item-url">URL</label>
              <div className="input-with-icon">
                <Link2 size={16} />
                <input
                  id="item-url"
                  className="ui-input"
                  value={url}
                  onChange={(event) => setUrl(event.target.value)}
                  placeholder="https://example.com"
                />
              </div>
            </>
          )}
          {error && <p className="form-error">{error}</p>}
          <div className="dialog-actions">
            <button type="button" className="ui-button secondary" onClick={onClose} disabled={saving}>Cancel</button>
            <button type="submit" className="ui-button primary" disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
          </div>
        </form>
      </section>
    </div>
  )
}

interface DeleteModalProps {
  node: BookmarkNode
  onClose: () => void
  onConfirm: () => Promise<void>
}

export function DeleteModal({ node, onClose, onConfirm }: DeleteModalProps) {
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => event.key === 'Escape' && !deleting && onClose()
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [deleting, onClose])

  const confirm = async () => {
    setDeleting(true)
    setError('')
    try {
      await onConfirm()
      onClose()
    } catch {
      setError('That item could not be removed. Please try again.')
      setDeleting(false)
    }
  }

  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={() => { if (!deleting) onClose() }}>
      <section className="ui-dialog delete-dialog" role="alertdialog" aria-modal="true" aria-labelledby="delete-title" onMouseDown={(event) => event.stopPropagation()}>
        <div className="danger-mark"><AlertTriangle size={22} /></div>
        <h2 id="delete-title">Remove “{node.title}”?</h2>
        <p>
          {node.url ? 'This bookmark' : 'This folder and everything inside it'} will be removed from Chrome bookmarks.
        </p>
        {error && <p className="form-error">{error}</p>}
        <div className="dialog-actions centered">
          <button className="ui-button secondary" onClick={onClose} disabled={deleting}>Cancel</button>
          <button className="ui-button danger" onClick={() => void confirm()} disabled={deleting}>{deleting ? 'Removing...' : 'Remove'}</button>
        </div>
      </section>
    </div>
  )
}
