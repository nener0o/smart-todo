import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api, onUnauthorized, tokenStorage } from '../api/client'
import type { Token, User } from '../api/types'
import { AuthContext, type AuthState } from './context'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(() => Boolean(tokenStorage.get()))

  useEffect(() => {
    if (!tokenStorage.get()) return
    let cancelled = false
    api.auth
      .me()
      .then((u) => {
        if (!cancelled) setUser(u)
      })
      .catch(() => tokenStorage.clear())
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const unsubscribe = onUnauthorized(() => setUser(null))
    return () => {
      unsubscribe()
    }
  }, [])

  const applyToken = useCallback((token: Token) => {
    tokenStorage.set(token.access_token)
    setUser(token.user)
  }, [])

  const value = useMemo<AuthState>(
    () => ({
      user,
      loading,
      login: async (email, password) => applyToken(await api.auth.login({ email, password })),
      register: async (name, email, password) => applyToken(await api.auth.register({ name, email, password })),
      logout: () => {
        tokenStorage.clear()
        setUser(null)
      },
    }),
    [user, loading, applyToken],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
