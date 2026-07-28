import type { FolderMetaMap } from '../types'
import { isExtensionContext } from './chromeApi'

const STORAGE_KEY = 'tabloom.preferences'

export interface Preferences {
  activeRootId?: string
  folderMeta: FolderMetaMap
}

const defaults: Preferences = { folderMeta: {} }

export async function getPreferences(): Promise<Preferences> {
  if (isExtensionContext) {
    const result = await chrome.storage.local.get(STORAGE_KEY)
    return { ...defaults, ...(result[STORAGE_KEY] as Preferences | undefined) }
  }
  const value = localStorage.getItem(STORAGE_KEY)
  return value ? { ...defaults, ...JSON.parse(value) as Preferences } : defaults
}

export async function savePreferences(preferences: Preferences): Promise<void> {
  if (isExtensionContext) {
    await chrome.storage.local.set({ [STORAGE_KEY]: preferences })
    return
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences))
}
