import { useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { nativeIcon } from '@/components/NativeIcon'
const ArrowLeft = nativeIcon('arrow-left')
const ChevronRight = nativeIcon('chevron-right')
const GripVertical = nativeIcon('drag-vertical')
const Menu = nativeIcon('menu')
const Pencil = nativeIcon('pencil-outline')
const Plus = nativeIcon('plus')
const Tag = nativeIcon('tag-outline')
const Trash2 = nativeIcon('trash-can-outline')
const X = nativeIcon('close')
const Broom = nativeIcon('broom')
import { toast } from 'sonner'
import { useLibrary } from '@/lib/store'
import { renameLabel } from '@/lib/library'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { IconButton } from '@/components/IconButton'
import { Modal } from '@/components/Modal'
import '@/styles/native-settings.css'

export function LabelsPage() {
  const { library, update } = useLibrary()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const view = params.get('view')
  const [editing, setEditing] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [removing, setRemoving] = useState<string | null>(null)
  const [clearAll, setClearAll] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const dragIndex = useRef<number | null>(null)
  const menuRef = useRef<HTMLButtonElement>(null)
  const duplicate = library.labels.some(
    label => label.name === name.trim() && label.name !== editing,
  )

  function move(from: number, to: number) {
    if (to < 0 || to >= library.labels.length || from === to) return
    update(s => {
      const labels = [...s.labels]
      const [item] = labels.splice(from, 1)
      labels.splice(to, 0, item)
      return { ...s, labels }
    })
  }
  function save() {
    const cleaned = name.trim()
    if (!cleaned || duplicate) return
    try {
      if (editing) update(s => renameLabel(s, editing, cleaned))
      else update(s => ({ ...s, labels: [...s.labels, { name: cleaned, ids: [] }] }))
      setEditing(null)
      setName('')
      if (view === 'new') setParams({})
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to save label')
    }
  }
  function closeConfirmation() {
    setClearAll(false)
    setRemoving(null)
  }
  return (
    <div
      className={`native-labels labels-page ${view === 'new' ? 'labels-create' : view === 'edit' ? 'labels-editor' : 'labels-browser'}`}
    >
      <header className="native-settings-header">
        <IconButton
          label={view === 'new' ? 'Cancel new label' : 'Go back'}
          onClick={() => (view ? setParams({}) : navigate('/'))}
        >
          {view === 'new' ? <X /> : <ArrowLeft />}
        </IconButton>
        <h1>{view === 'new' ? 'new label' : view === 'edit' ? 'edit labels' : 'labels'}</h1>
        {!view ? (
          <IconButton
            ref={menuRef}
            label="Labels menu"
            aria-haspopup="dialog"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(true)}
          >
            <Menu />
          </IconButton>
        ) : (
          <span className="native-header-spacer" />
        )}
      </header>
      {view === 'new' ? (
        <form
          className="native-label-create"
          onSubmit={event => {
            event.preventDefault()
            save()
          }}
        >
          <Input
            aria-label="Label name"
            placeholder="label"
            value={name}
            maxLength={32}
            autoCapitalize="none"
            autoFocus
            onChange={event => setName(event.target.value)}
          />
          {duplicate && <p role="alert">label already exists</p>}
          <Button className="native-label-save" type="submit" disabled={!name.trim() || duplicate}>
            create label
          </Button>
        </form>
      ) : view === 'edit' ? (
        <div className="native-label-editor-list">
          {library.labels.map((label, index) => (
            <div
              className="native-label-edit-row"
              data-label-index={index}
              key={label.name}
              draggable={editing === null}
              onDragStart={event => {
                dragIndex.current = index
                event.dataTransfer.setData('text/plain', String(index))
              }}
              onDragOver={event => event.preventDefault()}
              onDrop={event => {
                event.preventDefault()
                if (dragIndex.current !== null) move(dragIndex.current, index)
                dragIndex.current = null
              }}
            >
              <IconButton
                label={
                  editing === label.name ? `Cancel renaming ${label.name}` : `Rename ${label.name}`
                }
                onClick={() => {
                  setEditing(editing === label.name ? null : label.name)
                  setName(label.name)
                }}
              >
                {editing === label.name ? <X /> : <Pencil />}
              </IconButton>
              {editing === label.name ? (
                <form
                  className="native-label-rename"
                  onSubmit={event => {
                    event.preventDefault()
                    save()
                  }}
                >
                  <Input
                    aria-label="Label name"
                    value={name}
                    maxLength={32}
                    autoCapitalize="none"
                    autoFocus
                    onChange={event => setName(event.target.value)}
                  />
                  {duplicate && (
                    <span className="sr-only" role="alert">
                      label already exists
                    </span>
                  )}
                  <button className="sr-only" type="submit">
                    Save label
                  </button>
                  <IconButton
                    type="button"
                    label={`Delete ${label.name}`}
                    disabled={name !== label.name}
                    onClick={() => {
                      setRemoving(label.name)
                      setEditing(null)
                    }}
                  >
                    <Trash2 />
                  </IconButton>
                </form>
              ) : (
                <>
                  <span>{label.name}</span>
                  {editing === null && (
                    <IconButton
                      className="label-drag-handle"
                      label={`Reorder ${label.name}`}
                      aria-description="Drag to reorder, or use the up and down arrow keys."
                      onKeyDown={event => {
                        if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
                          event.preventDefault()
                          move(index, index + (event.key === 'ArrowUp' ? -1 : 1))
                        }
                      }}
                      onPointerDown={event => {
                        event.currentTarget.setPointerCapture(event.pointerId)
                        dragIndex.current = index
                      }}
                      onPointerUp={event => {
                        const row = document
                          .elementFromPoint(event.clientX, event.clientY)
                          ?.closest<HTMLElement>('[data-label-index]')
                        if (row && dragIndex.current !== null)
                          move(dragIndex.current, Number(row.dataset.labelIndex))
                        dragIndex.current = null
                      }}
                      onPointerCancel={() => {
                        dragIndex.current = null
                      }}
                    >
                      <GripVertical />
                    </IconButton>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      ) : (
        <>
          <div className="native-label-list">
            <div className="home-group">
              {!library.labels.length && <p className="native-label-empty">no labels yet</p>}
              {library.labels.map(label => (
                <Link
                  className="native-label-link"
                  key={label.name}
                  to={`/labels/${encodeURIComponent(label.name)}`}
                >
                  <Tag />
                  <span>{label.name}</span>
                  <ChevronRight />
                </Link>
              ))}
            </div>
          </div>
          <div className="native-label-actionbar">
            <Button
              variant="outline"
              aria-label="Create label"
              onClick={() => {
                setEditing(null)
                setName('')
                setParams({ view: 'new' })
              }}
            >
              <Plus />
              new
            </Button>
            <Button
              variant="outline"
              disabled={!library.labels.length}
              onClick={() => {
                setEditing(null)
                setParams({ view: 'edit' })
              }}
            >
              <Pencil />
              edit
            </Button>
          </div>
        </>
      )}
      <Modal
        title="labels menu"
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        variant="score-menu"
        returnFocus={menuRef}
      >
        <div className="score-menu-actions">
          <Button
            variant="ghost"
            onClick={() => {
              setMenuOpen(false)
              setClearAll(true)
            }}
          >
            <Broom />
            remove all labels
          </Button>
        </div>
      </Modal>
      <Modal
        title={clearAll ? 'remove all labels' : 'delete label'}
        open={clearAll || removing !== null}
        onClose={closeConfirmation}
      >
        <div className="native-confirm-actions">
          <Button
            variant="ghost"
            className="native-delete-action"
            onClick={() => {
              update(s => ({
                ...s,
                labels: clearAll ? [] : s.labels.filter(label => label.name !== removing),
              }))
              closeConfirmation()
            }}
          >
            {clearAll ? 'remove all labels' : 'delete label'}
          </Button>
          <Button variant="ghost" onClick={closeConfirmation}>
            cancel
          </Button>
        </div>
      </Modal>
    </div>
  )
}
