import { useEffect, useCallback, useRef, useState } from 'react'
import { supabase, hasSupabase } from './supabase'
import { load, normalizePlannerData } from './store'

const unscopedKey = 'oliarev-study-planner-v2'
const legacyUnscopedKey = 'oliarev-study-planner-v1'
const cacheKey = (userId) => (hasSupabase && userId !== 'local' ? `${unscopedKey}-${userId}` : unscopedKey)
const legacyCacheKey = (userId) => (hasSupabase && userId !== 'local' ? `${legacyUnscopedKey}-${userId}` : legacyUnscopedKey)

const normalize = normalizePlannerData

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
  const [dataOwner, setDataOwner] = useState(() => (userId ?? null))
  const [ready, setReady] = useState(false)
  const [syncStatus, setSyncStatus] = useState(hasSupabase && userId !== 'local' ? 'loading' : 'local')
  const saveTimer = useRef(null)
  const pendingSave = useRef(null)
  const remoteReady = useRef(false)
  const storeGeneration = useRef(0)
  const lastWrite = useRef(0)
  const lastSynced = useRef(0)

  const saveRemoteDebounced = useCallback(
    (payload) => {
      clearTimeout(saveTimer.current)
      setSyncStatus('saving')
      const generation = storeGeneration.current
      let save
      save = async () => {
        if (pendingSave.current === save) pendingSave.current = null
        const ts = Date.now()
        lastWrite.current = ts
        if (!lastSynced.current) {
          const { error } = await supabase
            .from('user_data')
            .upsert({ user_id: userId, data: payload, updated_at: new Date(ts).toISOString() })
          if (generation !== storeGeneration.current) return
          if (error) {
            console.error('Supabase-save:', error.message)
            setSyncStatus('error')
            return
          }
          lastSynced.current = ts
          setSyncStatus('saved')
          return
        }
        const { data: row, error } = await supabase
          .from('user_data')
          .update({ data: payload, updated_at: new Date(ts).toISOString() })
          .eq('user_id', userId)
          .eq('updated_at', new Date(lastSynced.current).toISOString())
          .select('updated_at')
          .maybeSingle()
        if (generation !== storeGeneration.current) return
        if (error) {
          console.error('Supabase-save:', error.message)
          setSyncStatus('error')
          return
        }
        if (row) {
          lastSynced.current = new Date(row.updated_at).getTime()
          setSyncStatus('saved')
          return
        }
        setSyncStatus('conflict')
        console.warn('Konflikt: raden ble endret av en annen enhet, henter nyeste versjon')
        const { data: fresh } = await supabase
          .from('user_data')
          .select('data, updated_at')
          .eq('user_id', userId)
          .maybeSingle()
        if (generation !== storeGeneration.current) return
        if (fresh?.data) {
          lastSynced.current = new Date(fresh.updated_at).getTime()
          setData(normalize(fresh.data))
          setDataOwner(userId)
        } else {
          const { error: e2 } = await supabase
            .from('user_data')
            .insert({ user_id: userId, data: payload, updated_at: new Date(ts).toISOString() })
          if (generation !== storeGeneration.current) return
          if (e2) setSyncStatus('error')
          else {
            lastSynced.current = ts
            setSyncStatus('saved')
          }
        }
      }
      pendingSave.current = save
      saveTimer.current = setTimeout(save, 800)
    },
    [userId],
  )

  useEffect(() => {
    storeGeneration.current++
    lastWrite.current = 0
    lastSynced.current = 0
    if (!userId) {
      remoteReady.current = false
      setData(null)
      setDataOwner(null)
      setReady(false)
      setSyncStatus('loading')
      return
    }
    if (!hasSupabase || userId === 'local') {
      remoteReady.current = false
      setData(load())
      setDataOwner(userId)
      setReady(true)
      setSyncStatus('local')
      return
    }
    let alive = true
    remoteReady.current = false
    setDataOwner(null)
    const fetchRemote = async () => {
      setReady(false)
      setSyncStatus('loading')
      const { data: row, error } = await supabase.from('user_data').select('data, updated_at').eq('user_id', userId).maybeSingle()
      if (!alive) return
      if (error) {
        console.error('Supabase-load:', error.message)
        setData(normalize(localData(userId)))
        setDataOwner(userId)
        setReady(true)
        setSyncStatus('error')
        return
      }
      remoteReady.current = true
      if (row?.data) {
        lastSynced.current = new Date(row.updated_at).getTime()
        setData(normalize(row.data))
        setDataOwner(userId)
        setSyncStatus('saved')
      } else {
        const next = normalize(localData(userId))
        setData(next)
        setDataOwner(userId)
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
          setDataOwner(userId)
          setSyncStatus('saved')
        },
      )
      .subscribe()
    return () => {
      alive = false
      clearTimeout(saveTimer.current)
      const save = pendingSave.current
      pendingSave.current = null
      save?.()
      sub.unsubscribe()
    }
  }, [userId, saveRemoteDebounced])

  const update = useCallback(
    (fn) => {
      setData((prev) => {
        if (!prev || dataOwner !== userId) return prev
        const next = normalize(fn(prev))
        localStorage.setItem(cacheKey(userId), JSON.stringify(next))
        if (hasSupabase && userId !== 'local' && remoteReady.current) saveRemoteDebounced(next)
        return next
      })
    },
    [dataOwner, userId, saveRemoteDebounced],
  )

  return { data, update, ready: ready && dataOwner === userId, syncStatus }
}
