import { lazy, Suspense } from 'react'

import { useWallet } from '@/hooks/useWallet/useWallet'
import { defaultSuspenseFallback } from '@/utils/makeSuspenseful'

const SeekerConnect = lazy(() =>
  import('@/context/WalletProvider/Seeker/components/Connect').then(({ SeekerConnect }) => ({
    default: SeekerConnect,
  })),
)

// Seeker routes component for the new wallet flow
export const SeekerRoutes = () => {
  const {
    state: { modalType },
  } = useWallet()

  if (!modalType) return null

  return (
    <Suspense fallback={defaultSuspenseFallback}>
      <SeekerConnect />
    </Suspense>
  )
}
