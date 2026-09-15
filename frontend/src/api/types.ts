export type Priority = 'low' | 'medium' | 'high'

export type Scope = 'all' | 'today' | 'overdue' | 'upcoming' | 'done' | 'no_date'

export interface User {
  id: number
  email: string
  name: string
}

export interface Token {
  access_token: string
  token_type: string
  user: User
}

export interface Task {
  id: number
  title: string
  raw_text: string | null
  category: string | null
  priority: Priority
  due_at: string | null
  is_done: boolean
  created_at: string
  updated_at: string
}

export interface TaskCreate {
  text: string
  category?: string | null
  priority?: Priority
  due_at?: string | null
}

export interface TaskUpdate {
  title?: string
  category?: string | null
  priority?: Priority
  due_at?: string | null
  clear_due?: boolean
  is_done?: boolean
}

export interface ParsePreview {
  title: string
  due_at: string | null
  matched: string[]
}

export interface TaskStats {
  total: number
  done: number
  overdue: number
  today: number
}

export interface TaskFilters {
  scope: Scope
  category?: string
  priority?: Priority
  search?: string
}
