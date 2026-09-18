import { useCallback, useEffect, useMemo, useState } from 'react'
import { api } from '../api/client'
import type { Priority, Scope, Task, TaskCreate, TaskStats, TaskUpdate } from '../api/types'
import { useAuth } from '../auth/useAuth'
import { SmartTaskInput } from '../components/SmartTaskInput'
import { TaskItem } from '../components/TaskItem'
import { Alert, Button, Input, Select, Spinner } from '../components/ui'
import { PRIORITIES } from '../lib/priority'

const SCOPES: { value: Scope; label: string }[] = [
  { value: 'all', label: 'Все' },
  { value: 'today', label: 'Сегодня' },
  { value: 'overdue', label: 'Просроченные' },
  { value: 'upcoming', label: 'Предстоящие' },
  { value: 'no_date', label: 'Без даты' },
  { value: 'done', label: 'Выполненные' },
]

const EMPTY_TEXT: Record<Scope, string> = {
  all: 'Задач пока нет. Напишите первую в поле выше — например, «завтра сходить к врачу».',
  today: 'На сегодня ничего не запланировано. Хороший день, чтобы разобрать «Без даты».',
  overdue: 'Просроченных задач нет. Так держать.',
  upcoming: 'Предстоящих задач нет.',
  no_date: 'Все задачи имеют срок.',
  done: 'Выполненных задач ещё нет.',
}

export function TasksPage() {
  const { user, logout } = useAuth()
  const [scope, setScope] = useState<Scope>('all')
  const [category, setCategory] = useState('')
  const [priority, setPriority] = useState<Priority | ''>('')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  const [tasks, setTasks] = useState<Task[] | null>(null)
  const [stats, setStats] = useState<TaskStats | null>(null)
  const [categories, setCategories] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 250)
    return () => clearTimeout(t)
  }, [search])

  const filters = useMemo(
    () => ({ scope, category: category || undefined, priority: priority || undefined, search: debouncedSearch || undefined }),
    [scope, category, priority, debouncedSearch],
  )

  const loadTasks = useCallback(async () => {
    try {
      setTasks(await api.tasks.list(filters))
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось загрузить задачи')
    }
  }, [filters])

  const loadMeta = useCallback(async () => {
    try {
      const [s, c] = await Promise.all([api.tasks.stats(), api.tasks.categories()])
      setStats(s)
      setCategories(c)
    } catch {
      /* статистика вторична, ошибка уже показана списком */
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    api.tasks
      .list(filters)
      .then((data) => {
        if (cancelled) return
        setTasks(data)
        setError(null)
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Не удалось загрузить задачи')
      })
    return () => {
      cancelled = true
    }
  }, [filters])

  useEffect(() => {
    let cancelled = false
    Promise.all([api.tasks.stats(), api.tasks.categories()])
      .then(([s, c]) => {
        if (cancelled) return
        setStats(s)
        setCategories(c)
      })
      .catch(() => {
        /* статистика вторична, ошибка уже показана списком */
      })
    return () => {
      cancelled = true
    }
  }, [])

  async function refresh() {
    await Promise.all([loadTasks(), loadMeta()])
  }

  async function handleCreate(data: TaskCreate) {
    await api.tasks.create(data)
    await refresh()
  }

  async function handleToggle(task: Task) {
    setTasks((prev) => prev?.map((t) => (t.id === task.id ? { ...t, is_done: !t.is_done } : t)) ?? null)
    try {
      await api.tasks.toggle(task.id)
    } finally {
      await refresh()
    }
  }

  async function handleUpdate(task: Task, data: TaskUpdate) {
    const updated = await api.tasks.update(task.id, data)
    setTasks((prev) => prev?.map((t) => (t.id === task.id ? updated : t)) ?? null)
    await loadMeta()
  }

  async function handleDelete(task: Task) {
    setTasks((prev) => prev?.filter((t) => t.id !== task.id) ?? null)
    try {
      await api.tasks.remove(task.id)
    } finally {
      await refresh()
    }
  }

  const hasFilters = Boolean(category || priority || debouncedSearch)

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-sm text-white">✓</div>
            <span className="font-semibold tracking-tight">Умный список задач</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden text-slate-500 sm:inline">{user?.name}</span>
            <Button variant="secondary" size="sm" onClick={logout}>
              Выйти
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-5 px-4 py-6">
        {stats && (
          <section className="grid grid-cols-2 gap-3 sm:grid-cols-4" aria-label="Статистика">
            <StatCard label="Сегодня" value={stats.today} accent="text-indigo-600" onClick={() => setScope('today')} active={scope === 'today'} />
            <StatCard label="Просрочено" value={stats.overdue} accent={stats.overdue ? 'text-rose-600' : 'text-slate-900'} onClick={() => setScope('overdue')} active={scope === 'overdue'} />
            <StatCard label="Выполнено" value={stats.done} accent="text-emerald-600" onClick={() => setScope('done')} active={scope === 'done'} />
            <StatCard label="Всего" value={stats.total} accent="text-slate-900" onClick={() => setScope('all')} active={scope === 'all'} />
          </section>
        )}

        <SmartTaskInput categories={categories} onCreate={handleCreate} />

        <section className="space-y-3">
          <div className="flex gap-1 overflow-x-auto pb-1" role="tablist" aria-label="Фильтр по сроку">
            {SCOPES.map((s) => (
              <button
                key={s.value}
                role="tab"
                aria-selected={scope === s.value}
                onClick={() => setScope(s.value)}
                className={`shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  scope === s.value ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-200/70'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Поиск по названию" aria-label="Поиск" className="sm:flex-1" />
            <Select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Категория">
              <option value="">Все категории</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
            <Select value={priority} onChange={(e) => setPriority(e.target.value as Priority | '')} aria-label="Приоритет">
              <option value="">Любой приоритет</option>
              {PRIORITIES.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </Select>
            {hasFilters && (
              <Button
                variant="ghost"
                onClick={() => {
                  setSearch('')
                  setCategory('')
                  setPriority('')
                }}
              >
                Сбросить
              </Button>
            )}
          </div>
        </section>

        {error && (
          <Alert>
            {error}{' '}
            <button className="ml-1 underline" onClick={() => void refresh()}>
              Повторить
            </button>
          </Alert>
        )}

        {tasks === null && !error ? (
          <div className="flex justify-center py-12">
            <Spinner />
          </div>
        ) : tasks && tasks.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white/50 px-6 py-12 text-center text-sm text-slate-500">
            {hasFilters ? 'По этим фильтрам ничего не найдено.' : EMPTY_TEXT[scope]}
          </div>
        ) : (
          tasks && (
            <ul className="space-y-2">
              {tasks.map((task) => (
                <TaskItem key={task.id} task={task} categories={categories} onToggle={handleToggle} onUpdate={handleUpdate} onDelete={handleDelete} />
              ))}
            </ul>
          )
        )}
      </main>
    </div>
  )
}

function StatCard({ label, value, accent, onClick, active }: { label: string; value: number; accent: string; onClick: () => void; active: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border bg-white px-4 py-3 text-left shadow-sm transition-colors hover:border-indigo-300 ${
        active ? 'border-indigo-400 ring-2 ring-indigo-500/15' : 'border-slate-200'
      }`}
    >
      <div className="text-xs text-slate-500">{label}</div>
      <div className={`mt-0.5 text-2xl font-semibold tabular-nums ${accent}`}>{value}</div>
    </button>
  )
}
