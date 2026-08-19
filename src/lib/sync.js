import { useEffect, useCallback, useState } from 'react'
import { supabase, hasSupabase } from './supabase'
import { load } from './store'

const unscopedKey = 'oliarev-study-planner-v1'
const cacheKey = (userId) => (hasSupabase ? `${unscopedKey}-${userId}` : unscopedKey)

function normalize(data) {
  if (!data) return data
  if (!Array.isArray(data.exams)) data.exams = []
  if (!Array.isArray(data.readings)) data.readings = []
  data.readings = (data.readings ?? []).map((r) => ({ chapters: [], ...r }))
  return data
}

function localData(userId) {
  try {
    const raw = localStorage.getItem(cacheKey(userId))
    if (raw) return normalize(JSON.parse(raw))
  } catch {
    /* ignore corrupted cache */
  }
  return null
}

export function useAuth() {
  const [user, setUser] = useState(null)
  const [status, setStatus] = useState('loading')
  useEffect(() => {
    if (!hasSupabase) {
      setUser({ id: 'local' })
      setStatus('ready')
      return
    }
    let alive = true
    supabase.auth.getSession().then(({ data }) => {
      if (!alive) return
      setUser(data.session?.user ?? null)
      setStatus('ready')
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!alive) return
      setUser(session?.user ?? null)
      setStatus('ready')
    })
    return () => {
      alive = false
      sub.subscription.unsubscribe()
    }
  }, [])
  return { user, status }
}

function saveRemote(userId, data) {
  supabase
    .from('user_data')
    .upsert({ user_id: userId, data, updated_at: new Date().toISOString() })
    .then(({ error }) => {
      if (error) console.error('Supabase-save:', error.message)
    })
}

export function useStore(user) {
  const userId = user?.id
  const [data, setData] = useState(() => (userId ? localData(userId) : null))
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!userId) {
      setData(null)
      setReady(false)
      return
    }
    if (!hasSupabase) {
      setData((d) => d ?? load())
      setReady(true)
      return
    }
    let alive = true
    const fetchRemote = async () => {
      setReady(false)
      const { data: row } = await supabase.from('user_data').select('data').eq('user_id', userId).maybeSingle()
      if (!alive) return
      if (row?.data) {
        setData(normalize(row.data))
      } else {
        const next = normalize(localData(userId) ?? load())
        setData(next)
        saveRemote(userId, next)
      }
      setReady(true)
    }
    fetchRemote()
    const sub = supabase
      .channel('planner-' + userId)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_data', filter: `user_id=eq.${userId}` },
        (payload) => {
          if (!alive || !payload.new?.data) return
          setData(normalize(payload.new.data))
        },
      )
      .subscribe()
    return () => {
      alive = false
      sub.unsubscribe()
    }
  }, [userId])

  const update = useCallback(
    (fn) => {
      setData((prev) => {
        if (!prev) return prev
        const next = normalize(fn(prev))
        localStorage.setItem(cacheKey(userId), JSON.stringify(next))
        if (hasSupabase) saveRemote(userId, next)
        return next
      })
    },
    [userId],
  )

  return { data, update, ready }
}