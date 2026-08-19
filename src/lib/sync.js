import { useEffect, useCallback, useRef, useState } from 'react'
import { supabase, hasSupabase } from './supabase'
import { load } from './store'

const unscopedKey = 'oliarev-study-planner-v2'
const cacheKey = (userId) => (hasSupabase && userId !== 'local' ? `${unscopedKey}-${userId}` : unscopedKey)

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

export function useStore(user) {
  const userId = user?.id
  const [data, setData] = useState(() => (userId ? localData(userId) : null))
  const [ready, setReady] = useState(false)
  const saveTimer = useRef(null)
  const lastWrite = useRef(0)

  const saveRemoteDebounced = useCallback(
    (payload) => {
      clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(() => {
        const ts = Date.now()
        lastWrite.current = ts
        supabase
          .from('user_data')
          .upsert({ user_id: userId, data: payload, updated_at: new Date(ts).toISOString() })
          .then(({ error }) => {
            if (error) console.error('Supabase-save:', error.message)
          })
      }, 800)
    },
    [userId],
  )

  useEffect(() => {
    if (!userId) {
      setData(null)
      setReady(false)
      return
    }
    if (!hasSupabase || userId === 'local') {
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
        saveRemoteDebounced(next)
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
          if (new Date(payload.new.updated_at).getTime() <= lastWrite.current) return
          setData(normalize(payload.new.data))
        },
      )
      .subscribe()
    return () => {
      alive = false
      clearTimeout(saveTimer.current)
      sub.unsubscribe()
    }
  }, [userId, saveRemoteDebounced])

  const update = useCallback(
    (fn) => {
      setData((prev) => {
        if (!prev) return prev
        const next = normalize(fn(prev))
        localStorage.setItem(cacheKey(userId), JSON.stringify(next))
        if (hasSupabase) saveRemoteDebounced(next)
        return next
      })
    },
    [userId, saveRemoteDebounced],
  )

  return { data, update, ready }
}