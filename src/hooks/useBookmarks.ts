import { useCallback, useEffect, useState } from 'react'
import type { BookmarkNode } from '../types'
import {
  createBookmark,
  getBookmarkTree,
  moveBookmark,
  removeBookmark,
  subscribeToBookmarks,
  updateBookmark,
} from '../services/chromeApi'
import { normalizeUrl } from '../utils/bookmarkTree'

export function useBookmarks() {
  const [tree, setTree] = useState<BookmarkNode[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const refresh = useCallback(async () => {
    try {
      setTree(await getBookmarkTree())
      setError('')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not load bookmarks.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
    return subscribeToBookmarks(() => void refresh())
  }, [refresh])

  const run = useCallback(async (operation: () => Promise<void>) => {
    try {
      await operation()
      await refresh()
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : 'The bookmark could not be changed.'
      setError(message)
      throw reason
    }
  }, [refresh])

  return {
    tree,
    loading,
    error,
    clearError: () => setError(''),
    create: (parentId: string, title: string, url?: string) =>
      run(() => createBookmark({ parentId, title: title.trim(), url: url ? normalizeUrl(url) : undefined })),
    update: (node: BookmarkNode, title: string, url?: string) =>
      run(() => updateBookmark(node.id, { title: title.trim(), ...(node.url ? { url: normalizeUrl(url ?? '') } : {}) })),
    remove: (node: BookmarkNode) => run(() => removeBookmark(node)),
    move: (id: string, parentId: string, index?: number) => run(() => moveBookmark(id, parentId, index)),
  }
}
