import { useSyncExternalStore } from 'react'

type Listener = () => void
type SetFn<S> = (partial: Partial<S> | ((s: S) => Partial<S>)) => void

export function createStore<S>(init: (set: SetFn<S>, get: () => S) => S) {
  let state: S
  const listeners = new Set<Listener>()

  const get = () => state
  const set: SetFn<S> = (partial) => {
    const patch = typeof partial === 'function' ? (partial as (s: S) => Partial<S>)(state) : partial
    // shallow merge like Zustand
    state = { ...state, ...patch }
    listeners.forEach((l) => l())
  }

  const subscribe = (l: Listener) => {
    listeners.add(l)
    return () => listeners.delete(l)
  }

  state = init(set, get)

  function useStore<T>(selector: (s: S) => T): T {
    const getSnap = () => selector(get())
    return useSyncExternalStore(subscribe, getSnap, getSnap)
  }

  return { get, set, subscribe, useStore }
}
