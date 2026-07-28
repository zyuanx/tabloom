import { describe, expect, it } from 'vitest'
import type { BookmarkNode } from '../types'
import { containsNode, countBookmarks, filterNodes, normalizeUrl } from './bookmarkTree'

const tree: BookmarkNode[] = [{
  id: '1',
  title: 'Design',
  children: [
    { id: '2', parentId: '1', title: 'Figma', url: 'https://figma.com' },
    { id: '3', parentId: '1', title: 'Research', children: [{ id: '4', title: 'NN Group', url: 'https://nngroup.com' }] },
  ],
}]

describe('bookmark tree utilities', () => {
  it('counts nested bookmarks', () => expect(countBookmarks(tree[0])).toBe(2))
  it('detects descendants', () => expect(containsNode(tree[0], '4')).toBe(true))
  it('keeps ancestors when filtering', () => expect(filterNodes(tree, 'NN Group')[0].children?.[0].id).toBe('3'))
  it('normalizes host-like URLs', () => expect(normalizeUrl('example.com')).toBe('https://example.com'))
})
