import { useCallback, useEffect, useRef, useState } from 'react'
import type { FolderMetaMap } from '../types'
import { getPreferences, savePreferences, type Preferences } from '../services/storage'

const palette = ['#5b8def', '#9a6dd7', '#3fb986', '#ef8956', '#d96896', '#32a6b8']
const previousPalette = ['#8fb5ff', '#b99bea', '#83d2ae', '#ffb28a', '#ef9fbd', '#79c8d8']
const legacyPalette = ['#dce8ff', '#e7e0f7', '#dcefe6', '#f8e3d8', '#f3e0e7', '#e1ebee']

export function folderColor(id: string, saved?: string): string {
  if (saved) {
    const paletteIndex = previousPalette.indexOf(saved)
    if (paletteIndex >= 0) return palette[paletteIndex]
    const legacyIndex = legacyPalette.indexOf(saved)
    return legacyIndex >= 0 ? palette[legacyIndex] : saved
  }
  const hash = [...id].reduce((sum, char) => sum + char.charCodeAt(0), 0)
  return palette[hash % palette.length]
}

export function usePreferences() {
  const [preferences, setPreferences] = useState<Preferences>({ folderMeta: {} })
  const [ready, setReady] = useState(false)
  const [error, setError] = useState('')
  const preferencesRef = useRef(preferences)
  const saveQueue = useRef(Promise.resolve())
  const mounted = useRef(true)
  const loadVersion = useRef(0)

  useEffect(() => {
    const version = ++loadVersion.current
    mounted.current = true
    void getPreferences()
      .then((value) => {
        if (!mounted.current || version !== loadVersion.current) return
        preferencesRef.current = value
        setPreferences(value)
      })
      .catch(() => {
        if (mounted.current && version === loadVersion.current) setError('Could not load preferences. Defaults are being used.')
      })
      .finally(() => {
        if (mounted.current && version === loadVersion.current) setReady(true)
      })
    return () => { mounted.current = false }
  }, [])

  const persist = useCallback((update: (current: Preferences) => Preferences) => {
    const next = update(preferencesRef.current)
    preferencesRef.current = next
    setPreferences(next)
    saveQueue.current = saveQueue.current
      .then(() => savePreferences(next))
      .then(() => { if (mounted.current) setError('') })
      .catch(() => { if (mounted.current) setError('Could not save preferences.') })
  }, [])

  const setActiveRootId = useCallback((activeRootId: string) => persist((current) => ({ ...current, activeRootId })), [persist])
  const updateFolderMeta = useCallback((id: string, updates: FolderMetaMap[string]) => persist((current) => ({
    ...current,
    folderMeta: {
      ...current.folderMeta,
      [id]: { ...current.folderMeta[id], ...updates },
    },
  })), [persist])
  const cycleFolderColor = useCallback((id: string) => persist((current) => {
    const color = folderColor(id, current.folderMeta[id]?.color)
    const next = palette[(palette.indexOf(color) + 1) % palette.length]
    return {
      ...current,
      folderMeta: {
        ...current.folderMeta,
        [id]: { ...current.folderMeta[id], color: next },
      },
    }
  }), [persist])
  const clearError = useCallback(() => setError(''), [])

  return { preferences, ready, error, clearError, setActiveRootId, updateFolderMeta, cycleFolderColor }
}
