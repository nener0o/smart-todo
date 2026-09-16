import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { Alert, Button, Input, Label } from '../components/ui'

export function AuthPage({ mode }: { mode: 'login' | 'register' }) {
  const { user, login, register } = useAuth()
  const location = useLocation()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (user) return <Navigate to="/" replace />

  const isLogin = mode === 'login'

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      if (isLogin) await login(email, password)
      else await register(name, email, password)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Что-то пошло не так')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-2xl text-white shadow-lg shadow-indigo-600/30">
            ✓
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Умный список задач</h1>
          <p className="mt-1 text-sm text-slate-500">Пишите задачи как думаете — дата подставится сама.</p>
        </div>

        <form onSubmit={handleSubmit} className="animate-fade-in space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">{isLogin ? 'Вход' : 'Регистрация'}</h2>

          {!isLogin && (
            <div>
              <Label htmlFor="name">Имя</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required maxLength={100} placeholder="Как к вам обращаться" autoComplete="name" />
            </div>
          )}
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@example.com" autoComplete="email" />
          </div>
          <div>
            <Label htmlFor="password">Пароль</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              placeholder={isLogin ? '••••••' : 'Минимум 6 символов'}
              autoComplete={isLogin ? 'current-password' : 'new-password'}
            />
          </div>

          {error && <Alert>{error}</Alert>}

          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? 'Подождите…' : isLogin ? 'Войти' : 'Создать аккаунт'}
          </Button>

          <p className="text-center text-sm text-slate-500">
            {isLogin ? (
              <>
                Нет аккаунта?{' '}
                <Link to="/register" state={location.state} className="font-medium text-indigo-600 hover:underline">
                  Зарегистрируйтесь
                </Link>
              </>
            ) : (
              <>
                Уже есть аккаунт?{' '}
                <Link to="/login" state={location.state} className="font-medium text-indigo-600 hover:underline">
                  Войти
                </Link>
              </>
            )}
          </p>
        </form>
      </div>
    </div>
  )
}
