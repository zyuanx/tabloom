import type { BookmarkNode } from '../types'

export function findNode(nodes: BookmarkNode[], id: string): BookmarkNode | undefined {
  for (const node of nodes) {
    if (node.id === id) return node
    const match = node.children && findNode(node.children, id)
    if (match) return match
  }
}

export function containsNode(node: BookmarkNode, id: string): boolean {
  return node.id === id || Boolean(node.children?.some((child) => containsNode(child, id)))
}

export function getBookmarkMoveIndex(node: BookmarkNode, parentId: string, targetIndex?: number): number | undefined {
  if (targetIndex === undefined) return undefined
  return node.parentId === parentId && node.index !== undefined && node.index < targetIndex
    ? targetIndex + 1
    : targetIndex
}

export function countBookmarks(node: BookmarkNode): number {
  if (node.url) return 1
  return node.children?.reduce((sum, child) => sum + countBookmarks(child), 0) ?? 0
}

export function filterNodes(nodes: BookmarkNode[], rawQuery: string): BookmarkNode[] {
  const query = rawQuery.trim().toLocaleLowerCase()
  if (!query) return nodes

  return nodes.flatMap((node) => {
    const children = filterNodes(node.children ?? [], query)
    const matches = `${node.title} ${node.url ?? ''}`.toLocaleLowerCase().includes(query)
    return matches || children.length ? [{ ...node, children }] : []
  })
}

export function getRootFolders(tree: BookmarkNode[]): BookmarkNode[] {
  return tree[0]?.children ?? []
}

export function normalizeUrl(value: string): string {
  const url = value.trim()
  if (!url) return ''
  if (/^[a-z][a-z\d+.-]*:/i.test(url)) return url
  return `https://${url}`
}

export function getHostname(url?: string): string {
  if (!url) return ''
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}
