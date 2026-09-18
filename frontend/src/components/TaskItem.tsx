import { useState, type FormEvent } from 'react'
import type { Priority, Task, TaskUpdate } from '../api/types'
import { formatDue, isOverdue, toDatetimeLocal } from '../lib/dates'
import { PRIORITIES, priorityMeta } from '../lib/priority'
import { CalendarIcon } from './SmartTaskInput'
import { Badge, Button, Input, Label, Select } from './ui'

interface Props {
  task: Task
  categories: string[]
  onToggle: (task: Task) => Promise<void>
  onUpdate: (task: Task, data: TaskUpdate) => Promise<void>
  onDelete: (task: Task) => Promise<void>
}

export function TaskItem({ task, categories, onToggle, onUpdate, onDelete }: Props) {
  const [editing, setEditing] = useState(false)
  const [busy, setBusy] = useState(false)
  const overdue = isOverdue(task.due_at, task.is_done)
  const prio = priorityMeta(task.priority)

  async function run(action: () => Promise<void>) {
    setBusy(true)
    try {
      await action()
    } finally {
      setBusy(false)
    }
  }

  if (editing) {
    return (
      <li className="animate-fade-in rounded-xl border border-indigo-200 bg-white p-4 shadow-sm">
        <EditForm
          task={task}
          categories={categories}
          onCancel={() => setEditing(false)}
          onSave={async (data) => {
            await run(() => onUpdate(task, data))
            setEditing(false)
          }}
        />
      </li>
    )
  }

  return (
    <li
      className={`group flex items-start gap-3 rounded-xl border bg-white px-4 py-3 shadow-sm transition-colors ${
        overdue ? 'border-rose-200' : 'border-slate-200'
      } ${task.is_done ? 'opacity-60' : ''}`}
    >
      <button
        type="button"
        onClick={() => run(() => onToggle(task))}
        disabled={busy}
        aria-label={task.is_done ? 'Вернуть в работу' : 'Отметить выполненной'}
        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
          task.is_done ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-300 hover:border-indigo-500'
        }`}
      >
        {task.is_done && (
          <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
            <path fillRule="evenodd" d="M16.7 5.3a1 1 0 010 1.4l-8 8a1 1 0 01-1.4 0l-4-4a1 1 0 111.4-1.4L8 12.6l7.3-7.3a1 1 0 011.4 0z" clipRule="evenodd" />
          </svg>
        )}
      </button>

      <div className="min-w-0 flex-1">
        <p className={`text-sm font-medium break-words ${task.is_done ? 'line-through text-slate-500' : 'text-slate-900'}`}>{task.title}</p>
        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
          {task.due_at && (
            <span className={`inline-flex items-center gap-1 ${overdue ? 'font-medium text-rose-600' : ''}`}>
              <CalendarIcon />
              {formatDue(task.due_at)}
              {overdue && ' · просрочено'}
            </span>
          )}
          {task.category && <Badge className="bg-indigo-50 text-indigo-700">{task.category}</Badge>}
          <Badge className={prio.badge}>{prio.label}</Badge>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1 opacity-100 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
        <Button variant="ghost" size="sm" onClick={() => setEditing(true)} disabled={busy} aria-label="Редактировать">
          Изменить
        </Button>
        <Button
          variant="danger"
          size="sm"
          disabled={busy}
          onClick={() => {
            if (window.confirm(`Удалить задачу «${task.title}»?`)) void run(() => onDelete(task))
          }}
          aria-label="Удалить"
        >
          Удалить
        </Button>
      </div>
    </li>
  )
}

function EditForm({
  task,
  categories,
  onSave,
  onCancel,
}: {
  task: Task
  categories: string[]
  onSave: (data: TaskUpdate) => Promise<void>
  onCancel: () => void
}) {
  const [title, setTitle] = useState(task.title)
  const [category, setCategory] = useState(task.category ?? '')
  const [priority, setPriority] = useState<Priority>(task.priority)
  const [due, setDue] = useState(toDatetimeLocal(task.due_at))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const data: TaskUpdate = { title: title.trim(), category: category.trim() || null, priority }
      if (due) data.due_at = due.length === 16 ? `${due}:00` : due
      else data.clear_due = true
      await onSave(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось сохранить')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <Label htmlFor={`title-${task.id}`}>Название</Label>
        <Input id={`title-${task.id}`} value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={255} />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <Label htmlFor={`cat-${task.id}`}>Категория</Label>
          <Input id={`cat-${task.id}`} list={`cat-options-${task.id}`} value={category} onChange={(e) => setCategory(e.target.value)} maxLength={50} placeholder="Без категории" />
          <datalist id={`cat-options-${task.id}`}>
            {categories.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </div>
        <div>
          <Label htmlFor={`prio-${task.id}`}>Приоритет</Label>
          <Select id={`prio-${task.id}`} value={priority} onChange={(e) => setPriority(e.target.value as Priority)} className="w-full">
            {PRIORITIES.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor={`due-${task.id}`}>Срок</Label>
          <Input id={`due-${task.id}`} type="datetime-local" value={due} onChange={(e) => setDue(e.target.value)} />
        </div>
      </div>
      {error && <p className="text-sm text-rose-600">{error}</p>}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" size="sm" onClick={onCancel} disabled={saving}>
          Отмена
        </Button>
        <Button type="submit" size="sm" disabled={saving || !title.trim()}>
          {saving ? 'Сохраняем…' : 'Сохранить'}
        </Button>
      </div>
    </form>
  )
}
