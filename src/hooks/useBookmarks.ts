import { useCallback, useEffect, useRef, useState } from 'react'
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
  const refreshVersion = useRef(0)
  const mounted = useRef(true)

  const refresh = useCallback(async (throwOnError = false) => {
    const version = ++refreshVersion.current
    try {
      const nextTree = await getBookmarkTree()
      if (mounted.current && version === refreshVersion.current) {
        setTree(nextTree)
        setError('')
      }
    } catch (reason) {
      if (mounted.current && version === refreshVersion.current) {
        setError(reason instanceof Error ? reason.message : 'Could not load bookmarks.')
      }
      if (throwOnError) throw reason
    } finally {
      if (mounted.current && version === refreshVersion.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    mounted.current = true
    void refresh()
    const unsubscribe = subscribeToBookmarks(() => void refresh())
    return () => {
      mounted.current = false
      unsubscribe()
    }
  }, [refresh])

  const run = useCallback(async (operation: () => Promise<void>) => {
    try {
      await operation()
      await refresh(true)
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : 'The bookmark could not be changed.'
      setError(message)
      throw reason
    }
  }, [refresh])

  const create = useCallback((parentId: string, title: string, url?: string) =>
    run(() => createBookmark({ parentId, title: title.trim(), url: url ? normalizeUrl(url) : undefined })), [run])
  const update = useCallback((node: BookmarkNode, title: string, url?: string) =>
    run(() => updateBookmark(node.id, { title: title.trim(), ...(node.url ? { url: normalizeUrl(url ?? '') } : {}) })), [run])
  const remove = useCallback((node: BookmarkNode) => run(() => removeBookmark(node)), [run])
  const move = useCallback((id: string, parentId: string, index?: number) => run(() => moveBookmark(id, parentId, index)), [run])
  const clearError = useCallback(() => setError(''), [])

  return {
    tree,
    loading,
    error,
    clearError,
    create,
    update,
    remove,
    move,
  }
}
