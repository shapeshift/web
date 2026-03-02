import type { AssetId } from '@shapeshiftoss/caip'
import { AnimatePresence } from 'framer-motion'
import { lazy, memo, Suspense, useEffect, useMemo } from 'react'

import { CollateralMachineCtx } from './CollateralMachineContext'

import { CircularProgress } from '@/components/CircularProgress/CircularProgress'
import { KeyManager } from '@/context/WalletProvider/KeyManager'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { CHAINFLIP_LENDING_ASSET_BY_ASSET_ID } from '@/lib/chainflip/constants'
import { useChainflipAccount } from '@/pages/ChainflipLending/hooks/useChainflipAccount'
import { useChainflipLoanAccount } from '@/pages/ChainflipLending/hooks/useChainflipLoanAccount'

const CollateralInput = lazy(() =>
  import('./CollateralInput').then(({ CollateralInput }) => ({ default: CollateralInput })),
)
const CollateralConfirm = lazy(() =>
  import('./CollateralConfirm').then(({ CollateralConfirm }) => ({ default: CollateralConfirm })),
)

const suspenseFallback = <CircularProgress />

type CollateralProps = {
  assetId: AssetId
  mode: 'add' | 'remove'
}

export const Collateral = memo(({ assetId, mode }: CollateralProps) => {
  const { connectedType } = useWallet().state
  const isNativeWallet = connectedType === KeyManager.Native
  const input = useMemo(() => ({ assetId, isNativeWallet, mode }), [assetId, isNativeWallet, mode])

  return (
    <CollateralMachineCtx.Provider options={{ input }}>
      <CollateralContent assetId={assetId} />
    </CollateralMachineCtx.Provider>
  )
})

const CollateralContent = memo(({ assetId }: { assetId: AssetId }) => {
  const isInput = CollateralMachineCtx.useSelector(s => s.matches('input'))
  const isConfirm = CollateralMachineCtx.useSelector(s => s.matches('confirm'))
  const isExecuting = CollateralMachineCtx.useSelector(s => s.hasTag('executing'))
  const isSuccess = CollateralMachineCtx.useSelector(s => s.matches('success'))
  const isError = CollateralMachineCtx.useSelector(s => s.matches('error'))

  useFreeBalanceSync(assetId)
  useCollateralBalanceSync(assetId)

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
        {page === 'input' && <CollateralInput assetId={assetId} />}
        {(page === 'confirm' || page === 'executing' || page === 'success' || page === 'error') && (
          <CollateralConfirm assetId={assetId} />
        )}
      </Suspense>
    </AnimatePresence>
  )
})

const useFreeBalanceSync = (assetId: AssetId) => {
  const actorRef = CollateralMachineCtx.useActorRef()
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

const useCollateralBalanceSync = (assetId: AssetId) => {
  const actorRef = CollateralMachineCtx.useActorRef()
  const { collateralWithFiat } = useChainflipLoanAccount()

  const collateralBalanceCryptoBaseUnit = useMemo(() => {
    const matching = collateralWithFiat.find(c => c.assetId === assetId)
    return matching?.amountCryptoBaseUnit ?? '0'
  }, [collateralWithFiat, assetId])

  useEffect(() => {
    actorRef.send({ type: 'SYNC_COLLATERAL_BALANCE', collateralBalanceCryptoBaseUnit })
  }, [actorRef, collateralBalanceCryptoBaseUnit])
}
