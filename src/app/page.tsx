'use client'

import { useEffect } from 'react'
import { useManya } from '@/lib/store'
import { Landing } from '@/components/manya/Landing'
import { Onboarding } from '@/components/manya/Onboarding'
import { Pulse } from '@/components/manya/Pulse'
import { Communities, CommunityDetail } from '@/components/manya/Communities'
import { Conclave } from '@/components/manya/Conclave'
import { CallRoom } from '@/components/manya/CallRoom'
import { Connect } from '@/components/manya/Connect'
import { MyWeb } from '@/components/manya/MyWeb'

export default function Home() {
  const { view, refresh } = useManya()

  useEffect(() => {
    void refresh()
  }, [refresh])

  switch (view) {
    case 'onboarding':
      return <Onboarding />
    case 'pulse':
      return <Pulse />
    case 'communities':
      return <Communities />
    case 'community':
      return <CommunityDetail />
    case 'conclave':
      return <Conclave />
    case 'room':
      return <CallRoom />
    case 'connect':
      return <Connect />
    case 'myweb':
      return <MyWeb />
    default:
      return <Landing />
  }
}
