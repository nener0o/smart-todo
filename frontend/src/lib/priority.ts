import type { Priority } from '../api/types'

export const PRIORITIES: { value: Priority; label: string; badge: string; dot: string }[] = [
  { value: 'high', label: 'Высокий', badge: 'bg-rose-100 text-rose-700', dot: 'bg-rose-500' },
  { value: 'medium', label: 'Средний', badge: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500' },
  { value: 'low', label: 'Низкий', badge: 'bg-slate-100 text-slate-600', dot: 'bg-slate-400' },
]

export function priorityMeta(p: Priority) {
  return PRIORITIES.find((x) => x.value === p) ?? PRIORITIES[1]
}
