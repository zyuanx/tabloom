import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  pointerWithin,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import {
  FolderPlus,
  LayoutGrid,
  Plus,
  Search,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { BookmarkBoard } from './components/BookmarkBoard'
import { DeleteModal, EditorModal } from './components/Modal'
import { useBookmarks } from './hooks/useBookmarks'
import { usePreferences } from './hooks/usePreferences'
import type { BookmarkNode, EditorIntent } from './types'
import { containsNode, countBookmarks, filterNodes, findNode, getBookmarkMoveIndex, getRootFolders } from './utils/bookmarkTree'

const collisionDetection: CollisionDetection = (args) => {
  const pointerCollisions = pointerWithin(args)
  const insertionTarget = pointerCollisions.find(({ id }) => {
    const targetId = String(id)
    return targetId.startsWith('list-insert:')
      || targetId.startsWith('item-preview:')
      || targetId.startsWith('folder-card-preview:')
  })
  if (insertionTarget) {
    const insertionData = insertionTarget.data?.droppableContainer.data.current
    const firstNodeId = insertionData?.targetNodeId
    if (
      String(insertionTarget.id).startsWith('list-insert:')
      && firstNodeId
      && String(args.active.data.current?.parentId) === String(insertionData.parentId)
    ) {
      const firstNode = closestCenter(args).find(({ id }) => String(id) === `node:${String(firstNodeId)}`)
      if (firstNode) return [firstNode]
    }
    return [insertionTarget]
  }
  const primaryId = String(pointerCollisions[0]?.id ?? '')
  if (primaryId.startsWith('folder:')) {
    const folderId = primaryId.slice('folder:'.length)
    const nearestNode = closestCenter(args).find(({ id, data }) => (
      String(id).startsWith('node:')
      && String(data?.droppableContainer.data.current?.parentId) === folderId
    ))
    const nearestRect = nearestNode ? args.droppableRects.get(nearestNode.id) : undefined
    const pointerY = args.pointerCoordinates?.y
    if (
      nearestNode
      && nearestRect
      && pointerY !== undefined
      && pointerY >= nearestRect.top - 10
      && pointerY <= nearestRect.bottom + 10
    ) return [nearestNode]
  }
  const primaryNodeId = primaryId.startsWith('top-node:')
    ? primaryId.slice('top-node:'.length)
    : primaryId.startsWith('node:')
      ? primaryId.slice('node:'.length)
      : undefined
  const matchingFolderTarget = primaryNodeId
    ? pointerCollisions.find(({ id }) => String(id) === `folder:${primaryNodeId}`)
    : undefined
  if (matchingFolderTarget) return [matchingFolderTarget]
  const specificTargets = pointerCollisions.filter(({ id }) => !String(id).startsWith('root-folder:'))
  if (specificTargets.length) return specificTargets
  if (pointerCollisions.length) return pointerCollisions
  return closestCenter(args)
}

export default function App() {
  const bookmarks = useBookmarks()
  const { preferences, ready, setActiveRootId, updateFolderMeta, cycleFolderColor } = usePreferences()
  const [query, setQuery] = useState('')
  const [editor, setEditor] = useState<EditorIntent | null>(null)
  const [deleting, setDeleting] = useState<BookmarkNode | null>(null)
  const [toast, setToast] = useState('')
  const [dragLabel, setDragLabel] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const roots = useMemo(() => getRootFolders(bookmarks.tree), [bookmarks.tree])
  const activeRoot = roots.find((root) => root.id === preferences.activeRootId) ?? roots[0]
  const visibleNodes = useMemo(
    () => filterNodes(activeRoot?.children ?? [], query),
    [activeRoot, query],
  )
  const bookmarkCount = useMemo(
    () => activeRoot?.children?.reduce((sum, node) => sum + countBookmarks(node), 0) ?? 0,
    [activeRoot],
  )

  useEffect(() => {
    if (ready && roots.length && !roots.some((root) => root.id === preferences.activeRootId)) {
      setActiveRootId(roots[0].id)
    }
  }, [preferences.activeRootId, ready, roots, setActiveRootId])

  useEffect(() => {
    if (!toast) return
    const timeout = window.setTimeout(() => setToast(''), 2800)
    return () => window.clearTimeout(timeout)
  }, [toast])

  useEffect(() => {
    const focusSearch = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        searchRef.current?.focus()
      }
    }
    window.addEventListener('keydown', focusSearch)
    return () => window.removeEventListener('keydown', focusSearch)
  }, [])

  const handleSave = async (title: string, url?: string) => {
    if (!editor) return
    if (editor.node) await bookmarks.update(editor.node, title, url)
    else await bookmarks.create(editor.parentId, title, url)
    setToast(editor.node ? 'Changes saved.' : `${editor.kind === 'folder' ? 'Folder' : 'Bookmark'} added.`)
  }

  const actions = {
    edit: (node: BookmarkNode) => setEditor({ kind: node.url ? 'bookmark' : 'folder', parentId: node.parentId!, node }),
    remove: (node: BookmarkNode) => setDeleting(node),
    createBookmark: (parentId: string) => setEditor({ kind: 'bookmark', parentId }),
    createFolder: (parentId: string) => setEditor({ kind: 'folder', parentId }),
    toggleFolder: (id: string, collapsed: boolean) => updateFolderMeta(id, { collapsed }),
    cycleColor: (id: string) => cycleFolderColor(id),
  }

  const handleDragStart = (event: DragStartEvent) => {
    const data = event.active.data.current
    if (data?.nodeId) setDragLabel(findNode(bookmarks.tree, String(data.nodeId))?.title ?? '')
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    setDragLabel('')
    const source = event.active.data.current
    const target = event.over?.data.current
    if (!source || event.active.id === event.over?.id) return

    const sourceNode = findNode(bookmarks.tree, String(source.nodeId))
    if (!sourceNode) return
    const parentId = target
      ? target.type === 'folder' ? String(target.folderId) : String(target.parentId)
      : activeRoot?.id
    const rawTargetIndex = target?.type === 'bookmark' ? Number(target.index) : undefined
    const targetIndex = rawTargetIndex !== undefined && Number.isFinite(rawTargetIndex) ? rawTargetIndex : undefined
    if (!parentId) return
    const index = getBookmarkMoveIndex(sourceNode, parentId, targetIndex)

    if (!sourceNode.url && containsNode(sourceNode, parentId)) {
      setToast('A folder cannot be moved inside itself.')
      return
    }

    try {
      await bookmarks.move(sourceNode.id, parentId, index)
      setToast(`Moved “${sourceNode.title}”.`)
    } catch {
      setToast('That item could not be moved.')
    }
  }

  if (bookmarks.loading || !ready) {
    return (
      <div className="splash">
        <div className="splash-mark">T</div>
        <p>Growing your bookmark garden...</p>
      </div>
    )
  }

  return (
    <DndContext sensors={sensors} collisionDetection={collisionDetection} onDragStart={handleDragStart} onDragEnd={(event) => void handleDragEnd(event)} onDragCancel={() => setDragLabel('')}>
      <div className="app-shell">
        <main className="main-content">
          <header className="main-header">
            <div className="header-topline">
              <div className="title-cluster">
                <span className="app-logo" aria-hidden="true">
                  <img src="/logo.svg" alt="" />
                </span>
                <h1>Bookmarks</h1>
                <span className="total-count">{bookmarkCount}</span>
              </div>
              <nav className="root-switcher" aria-label="Bookmark locations">
                <div className="root-tabs-list">
                  {roots.map((root) => (
                    <button key={root.id} data-state={root.id === activeRoot?.id ? 'active' : 'inactive'} onClick={() => setActiveRootId(root.id)}>
                      {root.title || 'Bookmarks'}
                    </button>
                  ))}
                </div>
              </nav>
              <label className="bookmark-search">
                <Search size={15} />
                <input ref={searchRef} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find a bookmark or folder" />
                <span className="search-actions">
                  {query && <button className="ui-icon-button" onClick={() => setQuery('')} aria-label="Clear search"><X size={13} /></button>}
                  <kbd>⌘ K</kbd>
                </span>
              </label>
              <button className="ui-button primary add-folder" onClick={() => activeRoot && actions.createFolder(activeRoot.id)} disabled={!activeRoot}>
                <FolderPlus size={17} /> New folder
              </button>
            </div>
          </header>

          <section className="board-section">
            <div className="section-heading">
              <div>
                <LayoutGrid size={16} />
                <span>{query ? `Results for “${query}”` : activeRoot?.title}</span>
              </div>
              <p>{query ? `${visibleNodes.length} top-level matches` : 'First-level items stay open. Hover a nested folder to explore deeper.'}</p>
            </div>
            {activeRoot && visibleNodes.length > 0 && (
              <BookmarkBoard
                rootId={activeRoot.id}
                nodes={visibleNodes}
                meta={preferences.folderMeta}
                actions={actions}
                dragDisabled={Boolean(query)}
              />
            )}
            {activeRoot && visibleNodes.length === 0 && (
              <div className="board-empty">
                <div className="empty-illustration">
                  <span /> <span /> <span />
                </div>
                <span className="eyebrow">A clear patch</span>
                <h2>{query ? 'Nothing found' : 'Start your first collection'}</h2>
                <p>{query ? 'Try a different title, website, or folder name.' : 'Create a folder, then add and organise useful links.'}</p>
                {query
                  ? <button className="ui-button secondary" onClick={() => setQuery('')}>Clear search</button>
                  : <button className="ui-button primary" onClick={() => actions.createFolder(activeRoot.id)}><Plus size={16} /> Create folder</button>}
              </div>
            )}
          </section>
        </main>
      </div>

      <DragOverlay dropAnimation={null}>{dragLabel && <div className="drag-overlay"><span className="site-icon">{dragLabel.charAt(0)}</span>{dragLabel}</div>}</DragOverlay>
      {editor && <EditorModal intent={editor} onClose={() => setEditor(null)} onSave={handleSave} />}
      {deleting && <DeleteModal node={deleting} onClose={() => setDeleting(null)} onConfirm={() => bookmarks.remove(deleting)} />}
      {(toast || bookmarks.error) && (
        <div className={`toast ${bookmarks.error ? 'error' : ''}`} role="status">
          <span>{bookmarks.error || toast}</span>
          <button onClick={() => { setToast(''); bookmarks.clearError() }} aria-label="Dismiss"><X size={15} /></button>
        </div>
      )}
    </DndContext>
  )
}
