import type { AssetId } from '@shapeshiftoss/caip'
import { AnimatePresence } from 'framer-motion'
import { lazy, memo, Suspense, useEffect, useMemo, useState } from 'react'

import { SupplyMachineCtx } from './SupplyMachineContext'

import { CircularProgress } from '@/components/CircularProgress/CircularProgress'
import { KeyManager } from '@/context/WalletProvider/KeyManager'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { CHAINFLIP_LENDING_ASSET_BY_ASSET_ID } from '@/lib/chainflip/constants'
import { useChainflipAccount } from '@/pages/ChainflipLending/hooks/useChainflipAccount'

const SupplyInput = lazy(() =>
  import('./SupplyInput').then(({ SupplyInput }) => ({ default: SupplyInput })),
)
const SupplyConfirm = lazy(() =>
  import('./SupplyConfirm').then(({ SupplyConfirm }) => ({ default: SupplyConfirm })),
)

const suspenseFallback = <CircularProgress />

type SupplyProps = {
  assetId: AssetId
}

export const Supply = memo(({ assetId: initialAssetId }: SupplyProps) => {
  const [activeAssetId, setActiveAssetId] = useState(initialAssetId)
  const { connectedType } = useWallet().state
  const isNativeWallet = connectedType === KeyManager.Native
  const input = useMemo(
    () => ({ assetId: activeAssetId, isNativeWallet }),
    [activeAssetId, isNativeWallet],
  )

  return (
    <SupplyMachineCtx.Provider key={activeAssetId} options={{ input }}>
      <SupplyContent assetId={activeAssetId} onAssetChange={setActiveAssetId} />
    </SupplyMachineCtx.Provider>
  )
})

const SupplyContent = memo(
  ({ assetId, onAssetChange }: { assetId: AssetId; onAssetChange: (assetId: AssetId) => void }) => {
    const isInput = SupplyMachineCtx.useSelector(s => s.matches('input'))
    const isConfirm = SupplyMachineCtx.useSelector(s => s.matches('confirm'))
    const isExecuting = SupplyMachineCtx.useSelector(s => s.hasTag('executing'))
    const isSuccess = SupplyMachineCtx.useSelector(s => s.matches('success'))
    const isError = SupplyMachineCtx.useSelector(s => s.matches('error'))

    useFreeBalanceSync(assetId)
    useLendingPositionSync(assetId)

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
          {page === 'input' && <SupplyInput assetId={assetId} onAssetChange={onAssetChange} />}
          {(page === 'confirm' ||
            page === 'executing' ||
            page === 'success' ||
            page === 'error') && <SupplyConfirm assetId={assetId} />}
        </Suspense>
      </AnimatePresence>
    )
  },
)

const useFreeBalanceSync = (assetId: AssetId) => {
  const actorRef = SupplyMachineCtx.useActorRef()
  const { freeBalances } = useChainflipAccount()

  const cfAsset = useMemo(() => CHAINFLIP_LENDING_ASSET_BY_ASSET_ID[assetId], [assetId])

  const freeBalanceCryptoBaseUnit = useMemo(() => {
    if (!Array.isArray(freeBalances) || !cfAsset) return '0'
    const matching = freeBalances.find(
      b => b.asset.chain === cfAsset.chain && b.asset.asset === cfAsset.asset,
    )
    return matching?.balance ?? '0'
  }, [freeBalances, cfAsset])

  useEffect(() => {
    actorRef.send({ type: 'SYNC_FREE_BALANCE', freeBalanceCryptoBaseUnit })
  }, [actorRef, freeBalanceCryptoBaseUnit])
}

const useLendingPositionSync = (assetId: AssetId) => {
  const actorRef = SupplyMachineCtx.useActorRef()
  const { accountInfo } = useChainflipAccount()
  const cfAsset = useMemo(() => CHAINFLIP_LENDING_ASSET_BY_ASSET_ID[assetId], [assetId])

  const lendingPositionCryptoBaseUnit = useMemo(() => {
    const positions = accountInfo?.lending_positions
    if (!Array.isArray(positions) || !cfAsset) return '0'
    const matching = positions.find(
      (p: { chain: string; asset: string; total_amount?: string }) =>
        p.chain === cfAsset.chain && p.asset === cfAsset.asset,
    )
    if (!matching?.total_amount) return '0'
    try {
      return BigInt(matching.total_amount).toString()
    } catch {
      return '0'
    }
  }, [accountInfo, cfAsset])

  useEffect(() => {
    actorRef.send({
      type: 'SYNC_LENDING_POSITION',
      initialLendingPositionCryptoBaseUnit: lendingPositionCryptoBaseUnit,
    })
  }, [actorRef, lendingPositionCryptoBaseUnit])
}
