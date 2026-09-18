import { useEffect, useRef, useState, type FormEvent } from 'react'
import { api } from '../api/client'
import type { ParsePreview, Priority, TaskCreate } from '../api/types'
import { formatDue } from '../lib/dates'
import { PRIORITIES } from '../lib/priority'
import { Alert, Button, Input, Select } from './ui'

const EXAMPLES = ['завтра сходить к врачу', 'сдать отчёт в пятницу в 15:00', 'позвонить маме через 2 дня', 'к четвергу подготовить презентацию']

interface Props {
  categories: string[]
  onCreate: (data: TaskCreate) => Promise<void>
}

export function SmartTaskInput({ categories, onCreate }: Props) {
  const [text, setText] = useState('')
  const [category, setCategory] = useState('')
  const [priority, setPriority] = useState<Priority>('medium')
  const [preview, setPreview] = useState<ParsePreview | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const trimmed = text.trim()
    let cancelled = false
    const timer = setTimeout(() => {
      if (!trimmed) {
        setPreview(null)
        return
      }
      api.tasks
        .parse(trimmed)
        .then((p) => {
          if (!cancelled) setPreview(p)
        })
        .catch(() => {
          if (!cancelled) setPreview(null)
        })
    }, trimmed ? 300 : 0)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [text])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const trimmed = text.trim()
    if (!trimmed) return
    setSubmitting(true)
    setError(null)
    try {
      await onCreate({ text: trimmed, category: category.trim() || null, priority })
      setText('')
      setPreview(null)
      inputRef.current?.focus()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось создать задачу')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Например: «завтра сходить к врачу в 15:00»"
          maxLength={500}
          autoFocus
          aria-label="Текст задачи"
          className="flex-1 py-2.5 text-base sm:text-sm"
        />
        <Button type="submit" disabled={submitting || !text.trim()} className="sm:w-auto">
          {submitting ? 'Добавляем…' : 'Добавить'}
        </Button>
      </div>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
        <Input
          list="category-options"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          placeholder="Категория (необязательно)"
          maxLength={50}
          aria-label="Категория"
          className="sm:max-w-56"
        />
        <datalist id="category-options">
          {categories.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
        <Select value={priority} onChange={(e) => setPriority(e.target.value as Priority)} aria-label="Приоритет">
          {PRIORITIES.map((p) => (
            <option key={p.value} value={p.value}>
              Приоритет: {p.label.toLowerCase()}
            </option>
          ))}
        </Select>
      </div>

      <div className="mt-3 min-h-6 text-sm">
        {preview && text.trim() ? (
          <div className="animate-fade-in flex flex-wrap items-center gap-x-2 gap-y-1 text-slate-600">
            <span className="font-medium text-slate-900">{preview.title}</span>
            {preview.due_at ? (
              <>
                <span className="text-slate-300">·</span>
                <span className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-0.5 font-medium text-indigo-700">
                  <CalendarIcon />
                  {formatDue(preview.due_at)}
                </span>
                {preview.matched.length > 0 && (
                  <span className="text-xs text-slate-400">распознано: «{preview.matched.join('», «')}»</span>
                )}
              </>
            ) : (
              <span className="text-xs text-slate-400">дата не распознана — задача будет без срока</span>
            )}
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-400">
            <span>Попробуйте:</span>
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                type="button"
                onClick={() => setText(ex)}
                className="rounded-md border border-slate-200 px-1.5 py-0.5 text-slate-500 hover:border-indigo-300 hover:text-indigo-600"
              >
                {ex}
              </button>
            ))}
          </div>
        )}
      </div>

      {error && (
        <div className="mt-3">
          <Alert>{error}</Alert>
        </div>
      )}
    </form>
  )
}

export function CalendarIcon({ className = 'h-3.5 w-3.5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <path
        fillRule="evenodd"
        d="M5.75 2a.75.75 0 01.75.75V4h7V2.75a.75.75 0 011.5 0V4h.25A2.75 2.75 0 0118 6.75v8.5A2.75 2.75 0 0115.25 18H4.75A2.75 2.75 0 012 15.25v-8.5A2.75 2.75 0 014.75 4H5V2.75A.75.75 0 015.75 2zm-1 5.5c-.69 0-1.25.56-1.25 1.25v6.5c0 .69.56 1.25 1.25 1.25h10.5c.69 0 1.25-.56 1.25-1.25v-6.5c0-.69-.56-1.25-1.25-1.25H4.75z"
        clipRule="evenodd"
      />
    </svg>
  )
}
