import { useDraggable, useDroppable } from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  ChevronDown,
  ExternalLink,
  Folder,
  FolderPlus,
  GripVertical,
  Link2,
  MoreHorizontal,
  Palette,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { BookmarkNode, FolderMetaMap } from '../types'
import { faviconUrl } from '../services/chromeApi'
import { countBookmarks, getHostname } from '../utils/bookmarkTree'
import { folderColor } from '../hooks/usePreferences'

interface BookmarkActions {
  edit: (node: BookmarkNode) => void
  remove: (node: BookmarkNode) => void
  createBookmark: (parentId: string) => void
  createFolder: (parentId: string) => void
  toggleFolder: (id: string, collapsed: boolean) => void
  cycleColor: (id: string) => void
}

function FolderMenu({ folder, actions }: { folder: BookmarkNode; actions: BookmarkActions }) {
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const closeOnEscape = (event: KeyboardEvent) => event.key === 'Escape' && setOpen(false)
    document.addEventListener('pointerdown', closeOnOutsideClick)
    window.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick)
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [open])

  const run = (action: () => void) => {
    setOpen(false)
    action()
  }

  return (
    <div ref={menuRef} className="card-menu">
      <button
        className="card-menu-trigger ui-icon-button"
        title="Folder actions"
        aria-label={`Actions for ${folder.title}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <MoreHorizontal size={17} />
      </button>
      {open && (
        <div className="card-menu-popover" role="menu">
          <button role="menuitem" onClick={() => run(() => actions.edit(folder))}><Pencil size={14} /> Rename</button>
          <button role="menuitem" onClick={() => run(() => actions.cycleColor(folder.id))}><Palette size={14} /> Change color</button>
          <span className="menu-separator" />
          <button className="destructive" role="menuitem" onClick={() => run(() => actions.remove(folder))}><Trash2 size={14} /> Delete</button>
        </div>
      )}
    </div>
  )
}

interface BookmarkRowProps {
  node: BookmarkNode
  actions: BookmarkActions
  dragDisabled: boolean
}

function BookmarkRow({ node, actions, dragDisabled }: BookmarkRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `node:${node.id}`,
    data: { type: 'bookmark', nodeId: node.id, parentId: node.parentId, index: node.index ?? 0 },
    disabled: dragDisabled,
  })
  const icon = faviconUrl(node.url!)

  return (
    <div ref={setNodeRef} className={`bookmark-row ${isDragging ? 'dragging' : ''}`} style={{ transform: CSS.Transform.toString(transform), transition }}>
      <button className="drag-handle" aria-label={`Drag ${node.title}`} {...attributes} {...listeners}><GripVertical size={14} /></button>
      <a className="bookmark-link" href={node.url} title={node.title} target="_blank" rel="noreferrer">
        <span className="site-icon">
          {icon ? <img src={icon} alt="" /> : <span>{node.title.charAt(0).toUpperCase()}</span>}
        </span>
        <span className="bookmark-copy">
          <strong>{node.title || getHostname(node.url)}</strong>
          <small>{getHostname(node.url)}</small>
        </span>
      </a>
      <div className="row-actions">
        <button onClick={() => actions.edit(node)} aria-label={`Edit ${node.title}`}><Pencil size={14} /></button>
        <button onClick={() => actions.remove(node)} aria-label={`Remove ${node.title}`}><Trash2 size={14} /></button>
      </div>
      <ExternalLink className="external-indicator" size={14} />
    </div>
  )
}

interface NestedFolderProps {
  node: BookmarkNode
  actions: BookmarkActions
  meta: FolderMetaMap
  dragDisabled: boolean
  depth: number
}

function NestedFolder({ node, actions, meta, dragDisabled, depth }: NestedFolderProps) {
  const collapsed = Boolean(meta[node.id]?.collapsed)
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `node:${node.id}`,
    data: { type: 'bookmark', nodeId: node.id, parentId: node.parentId, index: node.index ?? 0 },
    disabled: dragDisabled,
  })
  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: `folder:${node.id}`,
    data: { type: 'folder', folderId: node.id },
  })
  const setFolderRef = useCallback((element: HTMLDivElement | null) => {
    setNodeRef(element)
    setDropRef(element)
  }, [setDropRef, setNodeRef])
  const color = folderColor(node.id, meta[node.id]?.color)

  return (
    <div
      ref={setFolderRef}
      data-drop-label={`Move into ${node.title}`}
      className={`nested-folder depth-${Math.min(depth, 3)} ${collapsed ? 'is-collapsed' : ''} ${dragDisabled ? 'force-expanded' : ''} ${isDragging ? 'dragging' : ''} ${isOver ? 'drop-target' : ''}`}
      style={{ transform: CSS.Transform.toString(transform), transition, '--folder-color': color } as React.CSSProperties}
    >
      <div className="nested-heading">
        <button className="drag-handle" aria-label={`Drag ${node.title}`} {...attributes} {...listeners}><GripVertical size={14} /></button>
        <button className="folder-toggle" onClick={() => actions.toggleFolder(node.id, !collapsed)}>
          <ChevronDown size={14} className={collapsed ? 'rotated' : ''} />
          <Folder className="folder-icon" size={15} />
          <span>{node.title}</span>
          <small>{countBookmarks(node)}</small>
        </button>
        <div className="row-actions folder-actions">
          <button onClick={() => actions.createBookmark(node.id)} aria-label="Add bookmark"><Plus size={14} /></button>
          <button onClick={() => actions.edit(node)} aria-label={`Edit ${node.title}`}><Pencil size={14} /></button>
          <button onClick={() => actions.remove(node)} aria-label={`Remove ${node.title}`}><Trash2 size={14} /></button>
        </div>
      </div>
      <div className="nested-content">
        <BookmarkList nodes={node.children ?? []} actions={actions} meta={meta} dragDisabled={dragDisabled} depth={depth + 1} parentId={node.id} />
        {!node.children?.length && <button className="compact-empty" onClick={() => actions.createBookmark(node.id)}>Add a link to this folder</button>}
      </div>
    </div>
  )
}

interface BookmarkListProps {
  nodes: BookmarkNode[]
  actions: BookmarkActions
  meta: FolderMetaMap
  dragDisabled: boolean
  depth?: number
  parentId: string
}

function BookmarkList({ nodes, actions, meta, dragDisabled, depth = 1 }: BookmarkListProps) {
  return (
    <SortableContext items={nodes.map((node) => `node:${node.id}`)} strategy={verticalListSortingStrategy}>
      <div className="bookmark-list">
        {nodes.map((node) => node.url
          ? <BookmarkRow key={node.id} node={node} actions={actions} dragDisabled={dragDisabled} />
          : <NestedFolder key={node.id} node={node} actions={actions} meta={meta} dragDisabled={dragDisabled} depth={depth} />)}
      </div>
    </SortableContext>
  )
}

interface FolderCardProps {
  folder?: BookmarkNode
  id: string
  title: string
  parentId: string
  children: BookmarkNode[]
  color: string
  meta: FolderMetaMap
  actions: BookmarkActions
  dragDisabled: boolean
  virtual?: boolean
}

function FolderCard({ folder, id, title, parentId, children, color, meta, actions, dragDisabled, virtual }: FolderCardProps) {
  const [rowSpan, setRowSpan] = useState(1)
  const cardElement = useRef<HTMLDivElement | null>(null)
  const draggable = useDraggable({
    id: `node:${id}`,
    data: { type: 'bookmark', nodeId: id, parentId, index: folder?.index ?? 0 },
    disabled: dragDisabled || virtual,
  })
  const reorderDrop = useDroppable({
    id: `top-node:${id}`,
    data: { type: 'bookmark', nodeId: id, parentId, index: folder?.index ?? 0 },
    disabled: virtual,
  })
  const folderDrop = useDroppable({ id: `folder:${id}`, data: { type: 'folder', folderId: id } })
  const cardRef = useCallback((element: HTMLDivElement | null) => {
    cardElement.current = element
    draggable.setNodeRef(element)
    reorderDrop.setNodeRef(element)
  }, [draggable.setNodeRef, reorderDrop.setNodeRef])

  useLayoutEffect(() => {
    const element = cardElement.current
    if (!element) return

    const updateSpan = () => {
      // Keep this in sync with the 1px row and 13px gap in .bookmark-board.
      setRowSpan(Math.max(1, Math.ceil((element.getBoundingClientRect().height + 13) / 14)))
    }
    const observer = new ResizeObserver(updateSpan)
    observer.observe(element)
    updateSpan()
    return () => observer.disconnect()
  }, [])

  return (
    <article
      ref={cardRef}
      data-folder-card-id={id}
      data-drop-label={virtual ? 'Move to Quick links' : `Move into ${title}`}
      className={`folder-card ${dragDisabled ? 'force-expanded' : ''} ${draggable.isDragging ? 'dragging' : ''} ${reorderDrop.isOver ? 'sort-target' : ''} ${folderDrop.isOver ? 'drop-target' : ''}`}
      style={{ '--folder-color': color, gridRowEnd: `span ${rowSpan}` } as React.CSSProperties}
    >
      <header className="folder-card-header">
        <button className="card-drag-handle" aria-label={`Drag ${title}`} {...draggable.attributes} {...draggable.listeners} disabled={virtual}><GripVertical size={16} /></button>
        <div className="folder-title">
          {virtual ? <Link2 size={18} /> : <Folder className="folder-icon" size={19} />}
          <h2>{title}</h2>
          <span>{children.reduce((sum, node) => sum + countBookmarks(node), 0)}</span>
        </div>
        {!virtual && folder && <FolderMenu folder={folder} actions={actions} />}
      </header>
      <div ref={folderDrop.setNodeRef} className="folder-card-body">
        <BookmarkList nodes={children} actions={actions} meta={meta} dragDisabled={dragDisabled} parentId={id} />
        {!children.length && (
          <button className="empty-folder" onClick={() => actions.createBookmark(id)}>
            <span><Plus size={18} /></span>
            <strong>Add the first bookmark</strong>
            <small>Keep useful links together</small>
          </button>
        )}
      </div>
      <footer className="folder-card-footer">
        <button onClick={() => actions.createBookmark(id)}><Plus size={14} /> Link</button>
        <button onClick={() => actions.createFolder(id)}><FolderPlus size={14} /> Folder</button>
      </footer>
    </article>
  )
}

interface BoardProps {
  rootId: string
  nodes: BookmarkNode[]
  meta: FolderMetaMap
  actions: BookmarkActions
  dragDisabled: boolean
}

export function BookmarkBoard({ rootId, nodes, meta, actions, dragDisabled }: BoardProps) {
  const folders = nodes.filter((node) => !node.url)
  const links = nodes.filter((node) => node.url)
  const boardElement = useRef<HTMLDivElement | null>(null)
  const previousPositions = useRef(new Map<string, DOMRect>())
  const rootDrop = useDroppable({
    id: `root-folder:${rootId}`,
    data: { type: 'folder', folderId: rootId },
    disabled: dragDisabled,
  })
  const setBoardRef = useCallback((element: HTMLDivElement | null) => {
    boardElement.current = element
    rootDrop.setNodeRef(element)
  }, [rootDrop.setNodeRef])

  useLayoutEffect(() => {
    const board = boardElement.current
    if (!board) return

    const nextPositions = new Map<string, DOMRect>()
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const cards = board.querySelectorAll<HTMLElement>('[data-folder-card-id]')
    cards.forEach((card) => {
      card.getAnimations().forEach((animation) => animation.cancel())
      const id = card.dataset.folderCardId
      if (!id) return

      const next = card.getBoundingClientRect()
      const previous = previousPositions.current.get(id)
      nextPositions.set(id, next)
      if (!previous || reduceMotion) return

      const deltaX = previous.left - next.left
      const deltaY = previous.top - next.top
      if (Math.abs(deltaX) < 1 && Math.abs(deltaY) < 1) return

      card.animate(
        [
          { transform: `translate3d(${deltaX}px, ${deltaY}px, 0)`, opacity: 0.82 },
          { transform: 'translate3d(0, 0, 0)', opacity: 1 },
        ],
        { duration: 280, easing: 'cubic-bezier(.2, .8, .2, 1)' },
      )
    })
    previousPositions.current = nextPositions
  }, [nodes])

  return (
    <div
      ref={setBoardRef}
      className={`board-drop-surface ${rootDrop.isOver ? 'root-target' : ''}`}
    >
      <div className="bookmark-board">
        {folders.map((folder) => (
          <FolderCard
            key={folder.id}
            folder={folder}
            id={folder.id}
            parentId={rootId}
            title={folder.title}
            children={folder.children ?? []}
            color={folderColor(folder.id, meta[folder.id]?.color)}
            meta={meta}
            actions={actions}
            dragDisabled={dragDisabled}
          />
        ))}
        {links.length > 0 && (
          <FolderCard
            id={rootId}
            parentId={rootId}
            title="Quick links"
            children={links}
            color="#b8c5d6"
            meta={meta}
            actions={actions}
            dragDisabled={dragDisabled}
            virtual
          />
        )}
      </div>
    </div>
  )
}
