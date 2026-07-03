import { create } from 'zustand'

export interface DeviceInfo {
  deviceId: string
  name: string
  type: 'android' | 'pc'
  fingerprint: string
  platform?: string
  status: 'online' | 'offline' | 'busy'
  avatar?: string
  connectedAt?: string
  lastHeartbeat?: string
}

export interface ActivityInfo {
  id: string
  type: string
  title: string
  description?: string
  timestamp: string
}

export interface ChatMessage {
  id: string
  fromDeviceId: string
  fromDeviceName: string
  message: string
  timestamp: string
}

export interface EngagementInfo {
  engagementId: string
  pin: string
  partnerDeviceId?: string
  partnerName?: string
  message?: string
}

export interface MarriageInfo {
  proposalId: string
  partnerDeviceId: string
  partnerName?: string
  vows?: string
  message?: string
}

interface MarriageRingState {
  // Connection
  isConnected: boolean
  socket: any | null

  // Current device
  currentDevice: DeviceInfo | null
  isRegistered: boolean

  // Devices
  devices: DeviceInfo[]

  // Engagement
  engagementPin: string | null
  engagementStatus: 'idle' | 'generating' | 'waiting' | 'connected' | 'failed'
  activeEngagement: EngagementInfo | null

  // Marriage
  marriageProposals: MarriageInfo[]
  activeMarriages: MarriageInfo[]
  marriedPartnerIds: string[]

  // Activity
  activities: ActivityInfo[]

  // Chat
  chatMessages: ChatMessage[]

  // Actions
  setConnected: (connected: boolean) => void
  setSocket: (socket: any) => void
  setCurrentDevice: (device: DeviceInfo | null) => void
  setIsRegistered: (registered: boolean) => void
  setDevices: (devices: DeviceInfo[]) => void
  setEngagementPin: (pin: string | null) => void
  setEngagementStatus: (status: MarriageRingState['engagementStatus']) => void
  setActiveEngagement: (engagement: EngagementInfo | null) => void
  addMarriageProposal: (proposal: MarriageInfo) => void
  removeMarriageProposal: (proposalId: string) => void
  addActiveMarriage: (marriage: MarriageInfo) => void
  setMarriedPartnerIds: (ids: string[]) => void
  addActivity: (activity: ActivityInfo) => void
  setActivities: (activities: ActivityInfo[]) => void
  addChatMessage: (message: ChatMessage) => void
  clearChatMessages: () => void
  reset: () => void
}

const initialState = {
  isConnected: false,
  socket: null,
  currentDevice: null,
  isRegistered: false,
  devices: [],
  engagementPin: null,
  engagementStatus: 'idle' as const,
  activeEngagement: null,
  marriageProposals: [],
  activeMarriages: [],
  marriedPartnerIds: [],
  activities: [],
  chatMessages: [],
}

export const useMarriageRingStore = create<MarriageRingState>((set) => ({
  ...initialState,

  setConnected: (connected) => set({ isConnected: connected }),
  setSocket: (socket) => set({ socket }),
  setCurrentDevice: (device) => set({ currentDevice: device }),
  setIsRegistered: (registered) => set({ isRegistered: registered }),
  setDevices: (devices) => set({ devices }),
  setEngagementPin: (pin) => set({ engagementPin: pin }),
  setEngagementStatus: (status) => set({ engagementStatus: status }),
  setActiveEngagement: (engagement) => set({ activeEngagement: engagement }),

  addMarriageProposal: (proposal) =>
    set((state) => ({ marriageProposals: [...state.marriageProposals, proposal] })),

  removeMarriageProposal: (proposalId) =>
    set((state) => ({
      marriageProposals: state.marriageProposals.filter((p) => p.proposalId !== proposalId),
    })),

  addActiveMarriage: (marriage) =>
    set((state) => ({ activeMarriages: [...state.activeMarriages, marriage] })),

  setMarriedPartnerIds: (ids) => set({ marriedPartnerIds: ids }),

  addActivity: (activity) =>
    set((state) => ({
      activities: [activity, ...state.activities].slice(0, 50),
    })),

  setActivities: (activities) => set({ activities }),

  addChatMessage: (message) =>
    set((state) => ({ chatMessages: [...state.chatMessages, message] })),

  clearChatMessages: () => set({ chatMessages: [] }),

  reset: () => set(initialState),
}))
