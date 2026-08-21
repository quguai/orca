import { useEffect, useRef, useState } from 'react'
import { ChevronDown, LoaderCircle, Tag, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { translate } from '@/i18n/i18n'
import type {
  LocalTaskLabel,
  LocalTaskPriority,
  LocalTaskStatus
} from '../../../../shared/local-task-types'
import {
  ALL_PRIORITIES,
  ALL_STATUSES,
  getPriorityLabel,
  getStatusLabel,
  PriorityIcon,
  StatusIcon
} from './local-task-status-priority'
import { LocalTaskLabelPicker } from './local-task-label-manager'

const isMac = typeof navigator !== 'undefined' && navigator.userAgent.includes('Mac')
const submitShortcutLabel = isMac ? '⌘ Enter' : 'Ctrl+Enter'

function isSubmitShortcut(e: React.KeyboardEvent): boolean {
  return e.key === 'Enter' && (isMac ? e.metaKey : e.ctrlKey)
}

export function LocalTaskCreateDialog({
  open,
  onOpenChange,
  labels,
  onSave,
  onCreateLabel,
  onUpdateLabel,
  onDeleteLabel
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  labels: LocalTaskLabel[]
  onSave: (
    title: string,
    opts: {
      priority: LocalTaskPriority
      status: LocalTaskStatus
      description: string
      labelIds: string[]
    }
  ) => void | Promise<void>
  onCreateLabel: (name: string, color: string) => void
  onUpdateLabel: (id: string, name: string, color: string) => void
  onDeleteLabel: (id: string) => void
}): React.JSX.Element {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState<LocalTaskStatus>('todo')
  const [priority, setPriority] = useState<LocalTaskPriority>('none')
  const [labelIds, setLabelIds] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const titleRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setTitle('')
      setDescription('')
      setStatus('todo')
      setPriority('none')
      setLabelIds([])
      setSubmitting(false)
      setTimeout(() => titleRef.current?.focus(), 50)
    }
  }, [open])

  const handleSubmit = async (): Promise<void> => {
    const trimmed = title.trim()
    if (!trimmed || submitting) {
      return
    }
    setSubmitting(true)
    await onSave(trimmed, {
      priority,
      status,
      description: description.trim(),
      labelIds
    })
    setSubmitting(false)
    onOpenChange(false)
  }

  const handleToggleLabel = (id: string): void => {
    setLabelIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const selectedLabels = labels.filter((l) => labelIds.includes(l.id))

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!submitting) {
          onOpenChange(v)
        }
      }}
    >
      <DialogContent
        showCloseButton={false}
        className="flex flex-col gap-0 overflow-hidden rounded-xl border-border bg-background p-0 shadow-2xl sm:max-w-2xl"
        onKeyDown={(e) => {
          if (isSubmitShortcut(e as unknown as React.KeyboardEvent)) {
            e.preventDefault()
            void handleSubmit()
          }
        }}
      >
        <DialogTitle className="sr-only">
          {translate('auto.components.LocalTaskList.new_task', 'New task')}
        </DialogTitle>
        <DialogDescription className="sr-only">
          {translate('auto.components.LocalTaskList.create_description', 'Create a new local task')}
        </DialogDescription>

        {/* Header — matches Linear's new issue dialog header */}
        <div className="flex items-center justify-between border-b border-border/60 bg-muted/10 px-5 py-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {translate('auto.components.LocalTaskList.new_task', 'New Task')}
            </span>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Form body — matches Linear's input fields */}
        <div className="flex flex-col gap-3 px-6 py-4">
          <input
            ref={titleRef}
            autoFocus
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={translate('auto.components.LocalTaskList.issue_title', 'Issue title')}
            className="w-full bg-transparent p-0 text-lg font-semibold text-foreground outline-none placeholder:text-muted-foreground/40 focus:outline-none focus:ring-0 focus-visible:ring-0"
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={5}
            placeholder={translate(
              'auto.components.LocalTaskList.add_description',
              'Add description...'
            )}
            className="w-full min-w-0 max-h-60 resize-none overflow-y-auto bg-transparent p-0 py-1 text-sm text-foreground outline-none placeholder:text-muted-foreground/45 scrollbar-sleek focus:outline-none focus:ring-0 focus-visible:ring-0"
          />

          {/* Attribute badges — matches Linear's badge row */}
          <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-border/40 pt-4">
            <StatusBadgeSelector status={status} onChange={setStatus} />
            <PriorityBadgeSelector priority={priority} onChange={setPriority} />
            {selectedLabels.map((l) => (
              <button
                key={l.id}
                type="button"
                onClick={() => handleToggleLabel(l.id)}
                className="flex cursor-pointer items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium transition-opacity hover:opacity-80"
                style={{
                  backgroundColor: `${l.color}1A`,
                  border: `1px solid ${l.color}30`,
                  color: l.color
                }}
              >
                {l.name}
              </button>
            ))}
            <LocalTaskLabelPicker
              labels={labels}
              selectedIds={labelIds}
              onToggleLabel={handleToggleLabel}
              onCreateLabel={onCreateLabel}
              onUpdateLabel={onUpdateLabel}
              onDeleteLabel={onDeleteLabel}
            >
              <button
                type="button"
                className="flex cursor-pointer items-center gap-1.5 rounded-md border border-border/80 bg-muted/15 px-2 py-1 text-xs text-foreground/80 transition-colors hover:bg-muted/50 active:bg-muted"
              >
                <Tag className="size-3" />
                {translate('auto.components.LocalTaskList.labels', 'Labels')}
                <ChevronDown className="size-3 text-muted-foreground" />
              </button>
            </LocalTaskLabelPicker>
          </div>
        </div>

        {/* Footer — matches Linear's dialog footer */}
        <div className="flex items-center justify-between border-t border-border/60 bg-muted/5 px-6 py-4">
          <span className="text-[10px] font-medium text-muted-foreground/60">
            {translate(
              'auto.components.LocalTaskCreateDialog.shortcut_submit',
              '{{value0}} to submit',
              { value0: submitShortcutLabel }
            )}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => onOpenChange(false)}
            >
              {translate('auto.components.LocalTaskList.cancel', 'Cancel')}
            </Button>
            <Button
              size="sm"
              className="h-8 bg-foreground text-xs text-background hover:bg-foreground/90 disabled:opacity-50"
              onClick={() => void handleSubmit()}
              disabled={!title.trim() || submitting}
            >
              {submitting ? (
                <>
                  <LoaderCircle className="mr-1 size-3.5 animate-spin" />
                  {translate('auto.components.LocalTaskList.creating', 'Creating...')}
                </>
              ) : (
                translate('auto.components.LocalTaskList.create_task', 'Create task')
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function StatusBadgeSelector({
  status,
  onChange
}: {
  status: LocalTaskStatus
  onChange: (s: LocalTaskStatus) => void
}): React.JSX.Element {
  const [open, setOpen] = useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex cursor-pointer items-center gap-1.5 rounded-md border border-border/80 bg-muted/15 px-2 py-1 text-xs text-foreground/80 transition-colors hover:bg-muted/50 active:bg-muted"
        >
          <StatusIcon status={status} className="size-3" />
          {getStatusLabel(status)}
          <ChevronDown className="size-3 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-48 p-1 scrollbar-sleek"
        align="start"
        onClick={(e) => e.stopPropagation()}
      >
        {ALL_STATUSES.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => {
              onChange(s)
              setOpen(false)
            }}
            className={cn(
              'flex w-full cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-left text-xs transition-colors hover:bg-muted',
              status === s ? 'bg-muted font-medium text-foreground' : 'text-foreground/80'
            )}
          >
            <StatusIcon status={s} className="size-3" />
            {getStatusLabel(s)}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  )
}

function PriorityBadgeSelector({
  priority,
  onChange
}: {
  priority: LocalTaskPriority
  onChange: (p: LocalTaskPriority) => void
}): React.JSX.Element {
  const [open, setOpen] = useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex cursor-pointer items-center gap-1.5 rounded-md border border-border/80 bg-muted/15 px-2 py-1 text-xs text-foreground/80 transition-colors hover:bg-muted/50 active:bg-muted"
        >
          <PriorityIcon priority={priority} className="size-3" />
          {getPriorityLabel(priority)}
          <ChevronDown className="size-3 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-48 p-1 scrollbar-sleek"
        align="start"
        onClick={(e) => e.stopPropagation()}
      >
        {ALL_PRIORITIES.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => {
              onChange(p)
              setOpen(false)
            }}
            className={cn(
              'flex w-full cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-left text-xs transition-colors hover:bg-muted',
              priority === p ? 'bg-muted font-medium text-foreground' : 'text-foreground/80'
            )}
          >
            <PriorityIcon priority={p} className="size-3" />
            {getPriorityLabel(p)}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  )
}
