import type { AssetId } from '@shapeshiftoss/caip'
import { AnimatePresence } from 'framer-motion'
import { lazy, memo, Suspense, useEffect, useMemo } from 'react'

import { EgressMachineCtx } from './EgressMachineContext'

import { CircularProgress } from '@/components/CircularProgress/CircularProgress'
import { KeyManager } from '@/context/WalletProvider/KeyManager'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { CHAINFLIP_LENDING_ASSET_BY_ASSET_ID } from '@/lib/chainflip/constants'
import { useChainflipAccount } from '@/pages/ChainflipLending/hooks/useChainflipAccount'

const EgressInput = lazy(() =>
  import('./EgressInput').then(({ EgressInput }) => ({ default: EgressInput })),
)
const EgressConfirm = lazy(() =>
  import('./EgressConfirm').then(({ EgressConfirm }) => ({ default: EgressConfirm })),
)

const suspenseFallback = <CircularProgress />

type EgressProps = {
  assetId: AssetId
}

export const Egress = memo(({ assetId }: EgressProps) => {
  const { connectedType } = useWallet().state
  const isNativeWallet = connectedType === KeyManager.Native
  const input = useMemo(() => ({ assetId, isNativeWallet }), [assetId, isNativeWallet])

  return (
    <EgressMachineCtx.Provider options={{ input }}>
      <EgressContent assetId={assetId} />
    </EgressMachineCtx.Provider>
  )
})

const EgressContent = memo(({ assetId }: { assetId: AssetId }) => {
  const isInput = EgressMachineCtx.useSelector(s => s.matches('input'))
  const isConfirm = EgressMachineCtx.useSelector(s => s.matches('confirm'))
  const isExecuting = EgressMachineCtx.useSelector(s => s.hasTag('executing'))
  const isSuccess = EgressMachineCtx.useSelector(s => s.matches('success'))
  const isError = EgressMachineCtx.useSelector(s => s.matches('error'))

  useFreeBalanceSync(assetId)

  const page = useMemo(() => {
    if (isInput) return 'input' as const
    if (isConfirm) return 'confirm' as const
    if (isExecuting) return 'executing' as const
    if (isSuccess) return 'success' as const
    if (isError) return 'error' as const
    return 'input' as const
  }, [isInput, isConfirm, isExecuting, isSuccess, isError])

  return (
    <AnimatePresence mode='wait' initial={false}>
      <Suspense fallback={suspenseFallback}>
        {page === 'input' && <EgressInput assetId={assetId} />}
        {(page === 'confirm' || page === 'executing' || page === 'success' || page === 'error') && (
          <EgressConfirm assetId={assetId} />
        )}
      </Suspense>
    </AnimatePresence>
  )
})

const useFreeBalanceSync = (assetId: AssetId) => {
  const actorRef = EgressMachineCtx.useActorRef()
  const { freeBalances } = useChainflipAccount()

  const cfAsset = useMemo(() => CHAINFLIP_LENDING_ASSET_BY_ASSET_ID[assetId], [assetId])

  const freeBalanceCryptoBaseUnit = useMemo(() => {
    if (!freeBalances || !cfAsset) return '0'
    const matching = freeBalances.find(
      b => b.asset.chain === cfAsset.chain && b.asset.asset === cfAsset.asset,
    )
    return matching?.balance ?? '0'
  }, [freeBalances, cfAsset])

  useEffect(() => {
    actorRef.send({ type: 'SYNC_FREE_BALANCE', freeBalanceCryptoBaseUnit })
  }, [actorRef, freeBalanceCryptoBaseUnit])
}
