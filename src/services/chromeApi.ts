import { mockBookmarks } from '../data/mockData'
import type { BookmarkNode } from '../types'
import { findNode } from '../utils/bookmarkTree'

const MOCK_TREE_KEY = 'tabloom.mock-bookmarks'

export const isExtensionContext =
  typeof chrome !== 'undefined' && Boolean(chrome.runtime?.id) && Boolean(chrome.bookmarks)

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function withIndexes(nodes: BookmarkNode[]): BookmarkNode[] {
  return nodes.map((node, index) => ({
    ...node,
    index,
    children: node.children ? withIndexes(node.children) : undefined,
  }))
}

function toBookmarkNode(node: chrome.bookmarks.BookmarkTreeNode): BookmarkNode {
  return {
    id: node.id,
    parentId: node.parentId,
    index: node.index,
    title: node.title,
    url: node.url,
    dateAdded: node.dateAdded,
    children: node.children?.map(toBookmarkNode),
  }
}

function loadMockTree(): BookmarkNode[] {
  const stored = localStorage.getItem(MOCK_TREE_KEY)
  return stored ? JSON.parse(stored) as BookmarkNode[] : clone(mockBookmarks)
}

function saveMockTree(tree: BookmarkNode[]) {
  localStorage.setItem(MOCK_TREE_KEY, JSON.stringify(tree))
}

function detachNode(nodes: BookmarkNode[], id: string): BookmarkNode | undefined {
  for (const node of nodes) {
    const index = node.children?.findIndex((child) => child.id === id) ?? -1
    if (index >= 0) return node.children!.splice(index, 1)[0]
    const detached = node.children && detachNode(node.children, id)
    if (detached) return detached
  }
}

export async function getBookmarkTree(): Promise<BookmarkNode[]> {
  if (!isExtensionContext) return withIndexes(loadMockTree())
  const tree = await chrome.bookmarks.getTree()
  return tree.map(toBookmarkNode)
}

export async function createBookmark(details: { parentId: string; title: string; url?: string }): Promise<void> {
  if (isExtensionContext) {
    await chrome.bookmarks.create(details)
    return
  }

  const tree = loadMockTree()
  const parent = findNode(tree, details.parentId)
  if (!parent) throw new Error('Target folder no longer exists.')
  parent.children ??= []
  parent.children.push({
    id: `mock-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    parentId: details.parentId,
    title: details.title,
    url: details.url,
    children: details.url ? undefined : [],
  })
  saveMockTree(tree)
}

export async function updateBookmark(id: string, changes: { title?: string; url?: string }): Promise<void> {
  if (isExtensionContext) {
    await chrome.bookmarks.update(id, changes)
    return
  }

  const tree = loadMockTree()
  const node = findNode(tree, id)
  if (!node) throw new Error('Bookmark no longer exists.')
  Object.assign(node, changes)
  saveMockTree(tree)
}

export async function removeBookmark(node: BookmarkNode): Promise<void> {
  if (isExtensionContext) {
    if (node.url) await chrome.bookmarks.remove(node.id)
    else await chrome.bookmarks.removeTree(node.id)
    return
  }

  const tree = loadMockTree()
  detachNode(tree, node.id)
  saveMockTree(tree)
}

export async function moveBookmark(id: string, parentId: string, index?: number): Promise<void> {
  if (isExtensionContext) {
    await chrome.bookmarks.move(id, { parentId, index })
    return
  }

  const tree = loadMockTree()
  const node = detachNode(tree, id)
  const parent = findNode(tree, parentId)
  if (!node || !parent) throw new Error('Bookmark could not be moved.')
  parent.children ??= []
  node.parentId = parentId
  const targetIndex = index === undefined ? parent.children.length : Math.min(index, parent.children.length)
  parent.children.splice(targetIndex, 0, node)
  saveMockTree(tree)
}

export function subscribeToBookmarks(onChange: () => void): () => void {
  if (!isExtensionContext) return () => undefined
  const events = [
    chrome.bookmarks.onCreated,
    chrome.bookmarks.onRemoved,
    chrome.bookmarks.onChanged,
    chrome.bookmarks.onMoved,
    chrome.bookmarks.onChildrenReordered,
    chrome.bookmarks.onImportEnded,
  ]
  events.forEach((event) => event.addListener(onChange))
  return () => events.forEach((event) => event.removeListener(onChange))
}

export function faviconUrl(url: string, fallback?: string): string | undefined {
  if (isExtensionContext) {
    return `${chrome.runtime.getURL('/_favicon/')}?pageUrl=${encodeURIComponent(url)}&size=32`
  }
  return fallback
}
