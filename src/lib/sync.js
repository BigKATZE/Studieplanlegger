import { useEffect, useCallback, useRef, useState } from 'react'
import { supabase, hasSupabase } from './supabase'
import { load } from './store'

const unscopedKey = 'oliarev-study-planner-v2'
const legacyUnscopedKey = 'oliarev-study-planner-v1'
const cacheKey = (userId) => (hasSupabase && userId !== 'local' ? `${unscopedKey}-${userId}` : unscopedKey)
const legacyCacheKey = (userId) => (hasSupabase && userId !== 'local' ? `${legacyUnscopedKey}-${userId}` : legacyUnscopedKey)

function normalize(data) {
  if (!data) return data
  const exams = Array.isArray(data.exams) ? data.exams : []
  const readings = (Array.isArray(data.readings) ? data.readings : []).map((r) => ({ chapters: [], ...r }))
  if (exams === data.exams && readings === data.readings) return data
  return { ...data, exams, readings }
}

function localData(userId) {
  try {
    const raw = localStorage.getItem(cacheKey(userId)) ?? localStorage.getItem(legacyCacheKey(userId))
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
  const lastSynced = useRef(0)

  const saveRemoteDebounced = useCallback(
    (payload) => {
      clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(async () => {
        const ts = Date.now()
        lastWrite.current = ts
        if (!lastSynced.current) {
          const { error } = await supabase
            .from('user_data')
            .upsert({ user_id: userId, data: payload, updated_at: new Date(ts).toISOString() })
          if (error) return console.error('Supabase-save:', error.message)
          lastSynced.current = ts
          return
        }
        const { data: row, error } = await supabase
          .from('user_data')
          .update({ data: payload, updated_at: new Date(ts).toISOString() })
          .eq('user_id', userId)
          .eq('updated_at', new Date(lastSynced.current).toISOString())
          .select('updated_at')
          .maybeSingle()
        if (error) return console.error('Supabase-save:', error.message)
        if (row) {
          lastSynced.current = new Date(row.updated_at).getTime()
          return
        }
        console.warn('Konflikt: raden ble endret av en annen enhet, henter nyeste versjon')
        const { data: fresh } = await supabase
          .from('user_data')
          .select('data, updated_at')
          .eq('user_id', userId)
          .maybeSingle()
        if (fresh?.data) {
          lastSynced.current = new Date(fresh.updated_at).getTime()
          setData(normalize(fresh.data))
        } else {
          const { error: e2 } = await supabase
            .from('user_data')
            .insert({ user_id: userId, data: payload, updated_at: new Date(ts).toISOString() })
          if (!e2) lastSynced.current = ts
        }
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
      const { data: row } = await supabase.from('user_data').select('data, updated_at').eq('user_id', userId).maybeSingle()
      if (!alive) return
      if (row?.data) {
        lastSynced.current = new Date(row.updated_at).getTime()
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
          lastSynced.current = new Date(payload.new.updated_at).getTime()
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