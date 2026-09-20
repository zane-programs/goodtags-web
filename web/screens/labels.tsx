import { Fragment, useEffect, useRef, useState } from 'react'
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { restrictToParentElement, restrictToVerticalAxis } from '@dnd-kit/modifiers'
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  mdiBroom,
  mdiChevronRight,
  mdiClose,
  mdiDragVertical,
  mdiMenu,
  mdiPencilOutline,
  mdiPlus,
  mdiTagOutline,
  mdiTrashCanOutline,
} from '@mdi/js'
import { cn } from '@/lib/utils'
import { useLibrary } from '@/lib/store'
import { renameLabel } from '@/lib/library'
import { useIsFocused, useNavigation, useRoute } from '@/navigation/navigator'
import { AppHeader, BackButton } from '@/components/app-header'
import { ActionMenu } from '@/components/action-menu'
import { listMenuOffset } from '@/components/list-screen'
import { Button, IconButton } from '@/components/ui/button'
import { ConfirmDrawer } from '@/components/ui/drawer'
import { Icon } from '@/components/ui/icon'
import { Input } from '@/components/ui/input'
import { Item, ItemActions, ItemContent, ItemGroup, ItemMedia, ItemSeparator } from '@/components/ui/item'

/** LabelsScreen.tsx */
export function LabelsScreen() {
  const { library, update } = useLibrary()
  const { push } = useNavigation()
  const focused = useIsFocused()
  const [menuOpen, setMenuOpen] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const [screen, setScreen] = useState<HTMLDivElement | null>(null)
  useEffect(() => {
    if (!focused) setMenuOpen(false)
  }, [focused])
  return (
    <div ref={setScreen} className="relative flex min-h-0 flex-1 flex-col bg-secondary-container">
      <AppHeader
        title="labels"
        left={<BackButton />}
        right={
          <IconButton
            label="menu"
            className="m-1.5 size-[38px]"
            aria-haspopup="dialog"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(true)}
          >
            <Icon path={mdiMenu} size={22} />
          </IconButton>
        }
      />
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-[15px] pr-[calc(var(--spacing-safe-r)+15px)] pb-5 pl-[calc(var(--spacing-safe-l)+15px)]">
        <div className="mx-auto my-2 max-w-3xl px-2.5">
          <ItemGroup>
            {library.labels.length === 0 && (
              <Item>
                <ItemContent className="text-[14px] leading-5 text-outline">no labels yet</ItemContent>
              </Item>
            )}
            {library.labels.map((label, index) => (
              <Fragment key={label.name}>
                {index > 0 && <ItemSeparator />}
                <Item asChild>
                  <a
                    href={`/label/${encodeURIComponent(label.name)}`}
                    onClick={event => {
                      event.preventDefault()
                      push(`/label/${encodeURIComponent(label.name)}`)
                    }}
                  >
                    <ItemMedia>
                      <Icon path={mdiTagOutline} size={20} />
                    </ItemMedia>
                    <ItemContent>{label.name}</ItemContent>
                    <ItemActions>
                      <Icon path={mdiChevronRight} />
                    </ItemActions>
                  </a>
                </Item>
              </Fragment>
            ))}
          </ItemGroup>
        </div>
      </div>
      <div className="mx-auto flex w-full max-w-3xl gap-2.5 px-[15px] pt-[15px] pb-2.5">
        <Button variant="outlined" className="flex-1 rounded-[20px]" onClick={() => push('/labels/new')}>
          <Icon path={mdiPlus} size={22} />
          new
        </Button>
        <Button
          variant="outlined"
          className="flex-1 rounded-[20px]"
          disabled={library.labels.length === 0}
          onClick={() => push('/labels/edit')}
        >
          <Icon path={mdiPencilOutline} size={22} />
          edit
        </Button>
      </div>
      <ActionMenu
        title="labels menu"
        open={menuOpen}
        onOpenChange={setMenuOpen}
        container={screen}
        className={listMenuOffset}
        actions={[{ icon: mdiBroom, label: 'remove all labels', onPress: () => setConfirm(true) }]}
      />
      <ConfirmDrawer
        open={confirm}
        onOpenChange={setConfirm}
        action="remove all labels"
        onConfirm={() => update(s => ({ ...s, labels: [] }))}
      />
    </div>
  )
}

function EditorRow({
  name,
  editing,
  anyEditing,
  onEdit,
  onRename,
  onDelete,
}: {
  name: string
  editing: boolean
  anyEditing: boolean
  onEdit: (editing: boolean) => void
  onRename: (next: string) => void
  onDelete: () => void
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id: name })
  const [draft, setDraft] = useState(name)
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn(
        'relative flex h-[60px] items-center',
        isDragging ? 'z-10 bg-secondary-container' : 'bg-white',
      )}
    >
      <IconButton
        label={editing ? 'cancel' : `rename ${name}`}
        className="m-1.5 text-on-surface-variant"
        onClick={() => {
          setDraft(name)
          onEdit(!editing)
        }}
      >
        {/* Paper cross-fades and rotates between the two glyphs over 200ms. */}
        <Icon
          key={editing ? 'close' : 'edit'}
          path={editing ? mdiClose : mdiPencilOutline}
          className="animate-in duration-200 fade-in spin-in-90"
        />
      </IconButton>
      {editing ? (
        <form
          className="flex min-w-0 flex-1 items-center"
          onSubmit={event => {
            event.preventDefault()
            onRename(draft.trim())
          }}
        >
          <Input
            autoFocus
            aria-label="label"
            maxLength={32}
            autoCapitalize="none"
            enterKeyHint="done"
            value={draft}
            onChange={event => setDraft(event.target.value)}
          />
          <IconButton
            label={`delete ${name}`}
            className="m-1.5 text-on-surface-variant"
            disabled={draft !== name}
            onClick={onDelete}
          >
            <Icon path={mdiTrashCanOutline} />
          </IconButton>
        </form>
      ) : (
        <>
          <span className="ml-[5px] min-w-0 flex-1 truncate text-body-lg">{name}</span>
          {!anyEditing && (
            <IconButton
              ref={setActivatorNodeRef}
              label={`reorder ${name}`}
              className="m-1.5 size-9 touch-none text-black"
              {...attributes}
              {...listeners}
            >
              <Icon path={mdiDragVertical} size={20} />
            </IconButton>
          )}
        </>
      )}
    </div>
  )
}

/** LabelEditor.tsx: inline rename, drag handles that pick a row up the moment they are touched. */
export function LabelEditorScreen() {
  const { library, update } = useLibrary()
  const [editing, setEditing] = useState<string | null>(null)
  const [removing, setRemoving] = useState<string | null>(null)
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )
  const names = library.labels.map(label => label.name)
  function reorder({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return
    update(s => ({
      ...s,
      labels: arrayMove(
        s.labels,
        s.labels.findIndex(l => l.name === active.id),
        s.labels.findIndex(l => l.name === over.id),
      ),
    }))
  }
  return (
    <>
      <AppHeader title="edit labels" left={<BackButton />} />
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain py-[7px] pr-[calc(var(--spacing-safe-r)+10px)] pl-[calc(var(--spacing-safe-l)+15px)]">
        <div className="mx-auto max-w-3xl">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            modifiers={[restrictToVerticalAxis, restrictToParentElement]}
            onDragEnd={reorder}
          >
            <SortableContext items={names} strategy={verticalListSortingStrategy}>
              {names.map(name => (
                <EditorRow
                  key={name}
                  name={name}
                  editing={editing === name}
                  anyEditing={editing !== null}
                  onEdit={on => setEditing(on ? name : null)}
                  onDelete={() => setRemoving(name)}
                  onRename={next => {
                    // Names identify labels here, so a rename onto an existing name is ignored.
                    if (next && next !== name && !names.includes(next))
                      update(s => renameLabel(s, name, next))
                    setEditing(null)
                  }}
                />
              ))}
            </SortableContext>
          </DndContext>
        </div>
      </div>
      <ConfirmDrawer
        open={removing !== null}
        onOpenChange={open => !open && setRemoving(null)}
        action="delete label"
        onConfirm={() => {
          update(s => ({ ...s, labels: s.labels.filter(label => label.name !== removing) }))
          setEditing(null)
        }}
      />
    </>
  )
}

/** CreateLabel.tsx: optionally labels the tag it was opened from. */
export function CreateLabelScreen() {
  const { library, update } = useLibrary()
  const { back } = useNavigation()
  const { route, focused } = useRoute()
  const tagId = Number(route.params.tag) || undefined
  const [draft, setDraft] = useState('')
  const input = useRef<HTMLInputElement>(null)
  const name = draft.trim()
  const duplicate = library.labels.some(label => label.name === name)
  useEffect(() => {
    if (!focused) return
    const timer = setTimeout(() => input.current?.focus(), 50)
    return () => clearTimeout(timer)
  }, [focused])
  return (
    <>
      <AppHeader title="new label" left={<BackButton close />} />
      <form
        className="flex flex-col items-center p-2.5"
        onSubmit={event => {
          event.preventDefault()
          if (!name || duplicate) return
          update(s => ({ ...s, labels: [{ name, ids: tagId ? [tagId] : [] }, ...s.labels] }))
          back()
        }}
      >
        <div className="mt-5 w-[250px]">
          <Input
            ref={input}
            aria-label="label"
            placeholder="label"
            maxLength={32}
            autoCapitalize="none"
            enterKeyHint="done"
            value={draft}
            onChange={event => setDraft(event.target.value)}
          />
          {duplicate && (
            <p role="alert" className="mt-2 ml-3 text-label-sm font-black text-error">
              label already exists
            </p>
          )}
        </div>
      </form>
    </>
  )
}
