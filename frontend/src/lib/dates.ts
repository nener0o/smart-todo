const dateFmt = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' })
const dateYearFmt = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })
const timeFmt = new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' })
const weekdayFmt = new Intl.DateTimeFormat('ru-RU', { weekday: 'short' })

export function parseLocal(iso: string): Date {
  // Бэкенд отдаёт naive datetime без таймзоны — трактуем как локальное время.
  return new Date(iso.endsWith('Z') ? iso.slice(0, -1) : iso)
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

export function dayDiff(iso: string, now = new Date()) {
  const a = startOfDay(parseLocal(iso)).getTime()
  const b = startOfDay(now).getTime()
  return Math.round((a - b) / 86_400_000)
}

export function hasTime(iso: string) {
  const d = parseLocal(iso)
  return d.getHours() !== 0 || d.getMinutes() !== 0
}

export function formatDue(iso: string, now = new Date()): string {
  const d = parseLocal(iso)
  const diff = dayDiff(iso, now)
  let day: string
  if (diff === 0) day = 'Сегодня'
  else if (diff === 1) day = 'Завтра'
  else if (diff === -1) day = 'Вчера'
  else if (diff > 1 && diff < 7) day = capitalize(weekdayFmt.format(d))
  else if (d.getFullYear() === now.getFullYear()) day = dateFmt.format(d).replace('.', '')
  else day = dateYearFmt.format(d)
  return hasTime(iso) ? `${day}, ${timeFmt.format(d)}` : day
}

export function isOverdue(iso: string | null, done: boolean, now = new Date()) {
  if (!iso || done) return false
  return parseLocal(iso).getTime() < now.getTime()
}

export function toDatetimeLocal(iso: string | null): string {
  if (!iso) return ''
  const d = parseLocal(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}
