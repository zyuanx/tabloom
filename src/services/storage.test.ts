import { describe, expect, it } from 'vitest'
import { normalizePreferences } from './storage'

describe('preference storage', () => {
  it('falls back to defaults for invalid values', () => {
    expect(normalizePreferences(null)).toEqual({ folderMeta: {} })
    expect(normalizePreferences({ activeRootId: 3, folderMeta: null })).toEqual({ folderMeta: {} })
    expect(normalizePreferences({ folderMeta: [] })).toEqual({ folderMeta: {} })
  })

  it('keeps valid preference fields', () => {
    const folderMeta = { folder: { collapsed: true } }
    expect(normalizePreferences({ activeRootId: 'root', folderMeta })).toEqual({ activeRootId: 'root', folderMeta })
  })
})
