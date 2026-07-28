export interface BookmarkNode {
  id: string
  parentId?: string
  index?: number
  title: string
  url?: string
  dateAdded?: number
  children?: BookmarkNode[]
}

export interface FolderMeta {
  color?: string
  collapsed?: boolean
}

export type FolderMetaMap = Record<string, FolderMeta>

export type EditorIntent =
  | { kind: 'bookmark'; parentId: string; node?: BookmarkNode }
  | { kind: 'folder'; parentId: string; node?: BookmarkNode }
