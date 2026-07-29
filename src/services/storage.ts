import type { FolderMetaMap } from '../types'
import { isExtensionContext } from './chromeApi'

const STORAGE_KEY = 'tabloom.preferences'

export interface Preferences {
  activeRootId?: string
  folderMeta: FolderMetaMap
}

const defaults: Preferences = { folderMeta: {} }

export function normalizePreferences(value: unknown): Preferences {
  if (!value || typeof value !== 'object') return defaults
  const stored = value as Partial<Preferences>
  return {
    ...(typeof stored.activeRootId === 'string' ? { activeRootId: stored.activeRootId } : {}),
    folderMeta: stored.folderMeta && typeof stored.folderMeta === 'object' && !Array.isArray(stored.folderMeta) ? stored.folderMeta : {},
  }
}

export async function getPreferences(): Promise<Preferences> {
  if (isExtensionContext) {
    const result = await chrome.storage.local.get(STORAGE_KEY)
    return normalizePreferences(result[STORAGE_KEY])
  }
  const value = localStorage.getItem(STORAGE_KEY)
  return value ? normalizePreferences(JSON.parse(value) as unknown) : defaults
}

export async function savePreferences(preferences: Preferences): Promise<void> {
  if (isExtensionContext) {
    await chrome.storage.local.set({ [STORAGE_KEY]: preferences })
    return
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences))
}
