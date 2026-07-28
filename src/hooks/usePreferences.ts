import { useEffect, useState } from 'react'
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

  useEffect(() => {
    void getPreferences().then((value) => {
      setPreferences(value)
      setReady(true)
    })
  }, [])

  const persist = (next: Preferences) => {
    setPreferences(next)
    void savePreferences(next)
  }

  const setActiveRootId = (activeRootId: string) => persist({ ...preferences, activeRootId })
  const updateFolderMeta = (id: string, updates: FolderMetaMap[string]) => persist({
    ...preferences,
    folderMeta: {
      ...preferences.folderMeta,
      [id]: { ...preferences.folderMeta[id], ...updates },
    },
  })
  const cycleFolderColor = (id: string) => {
    const current = folderColor(id, preferences.folderMeta[id]?.color)
    const next = palette[(palette.indexOf(current) + 1) % palette.length]
    updateFolderMeta(id, { color: next })
  }

  return { preferences, ready, setActiveRootId, updateFolderMeta, cycleFolderColor }
}
