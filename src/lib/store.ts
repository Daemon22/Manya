'use client'

import { create } from 'zustand'
import type { Bootstrap, View, CallRoom } from './types'

interface ManyaState {
  view: View
  activeCommunity: string | null
  activeRoom: CallRoom | null
  data: Bootstrap | null
  loading: boolean
  go: (view: View) => void
  openCommunity: (slug: string) => void
  openRoom: (room: CallRoom) => void
  setData: (d: Bootstrap) => void
  refresh: () => Promise<void>
}

export const useManya = create<ManyaState>((set, get) => ({
  view: 'landing',
  activeCommunity: null,
  activeRoom: null,
  data: null,
  loading: true,
  go: (view) => {
    set({ view })
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
  },
  openCommunity: (slug) => set({ activeCommunity: slug, view: 'community' }),
  openRoom: (room) => set({ activeRoom: room, view: 'room' }),
  setData: (d) => set({ data: d, loading: false }),
  refresh: async () => {
    try {
      const res = await fetch('/api/bootstrap', { cache: 'no-store' })
      if (res.ok) set({ data: await res.json(), loading: false })
      else set({ loading: false })
    } catch {
      set({ loading: false })
    }
    void get
  },
}))
