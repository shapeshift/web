import type { AssetId } from '@shapeshiftoss/caip'
import { AnimatePresence } from 'framer-motion'
import { lazy, memo, Suspense, useEffect, useMemo } from 'react'

import { WithdrawMachineCtx } from './WithdrawMachineContext'

import { CircularProgress } from '@/components/CircularProgress/CircularProgress'
import { KeyManager } from '@/context/WalletProvider/KeyManager'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { CHAINFLIP_LENDING_ASSET_BY_ASSET_ID } from '@/lib/chainflip/constants'
import { useChainflipAccount } from '@/pages/ChainflipLending/hooks/useChainflipAccount'

const WithdrawInput = lazy(() =>
  import('./WithdrawInput').then(({ WithdrawInput }) => ({ default: WithdrawInput })),
)
const WithdrawConfirm = lazy(() =>
  import('./WithdrawConfirm').then(({ WithdrawConfirm }) => ({ default: WithdrawConfirm })),
)

const suspenseFallback = <CircularProgress />

type WithdrawProps = {
  assetId: AssetId
}

export const Withdraw = memo(({ assetId }: WithdrawProps) => {
  const { connectedType } = useWallet().state
  const isNativeWallet = connectedType === KeyManager.Native
  const input = useMemo(() => ({ assetId, isNativeWallet }), [assetId, isNativeWallet])

  return (
    <WithdrawMachineCtx.Provider options={{ input }}>
      <WithdrawContent assetId={assetId} />
    </WithdrawMachineCtx.Provider>
  )
})

const WithdrawContent = memo(({ assetId }: { assetId: AssetId }) => {
  const isInput = WithdrawMachineCtx.useSelector(s => s.matches('input'))
  const isExecuting = WithdrawMachineCtx.useSelector(s => s.hasTag('executing'))
  const isConfirm = WithdrawMachineCtx.useSelector(s => s.matches('confirm'))
  const isSuccess = WithdrawMachineCtx.useSelector(s => s.matches('success'))
  const isError = WithdrawMachineCtx.useSelector(s => s.matches('error'))

  useSupplyPositionSync()

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
        {page === 'input' && <WithdrawInput assetId={assetId} />}
        {(page === 'confirm' || page === 'executing' || page === 'success' || page === 'error') && (
          <WithdrawConfirm assetId={assetId} />
        )}
      </Suspense>
    </AnimatePresence>
  )
})

const useSupplyPositionSync = () => {
  const actorRef = WithdrawMachineCtx.useActorRef()
  const assetId = WithdrawMachineCtx.useSelector(s => s.context.assetId)
  const { accountInfo, isLoading } = useChainflipAccount()

  const cfAsset = useMemo(() => CHAINFLIP_LENDING_ASSET_BY_ASSET_ID[assetId], [assetId])

  const supplyPositionCryptoBaseUnit = useMemo(() => {
    if (!accountInfo?.lending_positions || !cfAsset) return '0'
    const position = accountInfo.lending_positions.find(
      p => p.chain === cfAsset.chain && p.asset === cfAsset.asset,
    )
    if (!position?.total_amount) return '0'
    try {
      return BigInt(position.total_amount).toString()
    } catch {
      return '0'
    }
  }, [accountInfo?.lending_positions, cfAsset])

  useEffect(() => {
    if (isLoading) return
    actorRef.send({
      type: 'SYNC_SUPPLY_POSITION',
      supplyPositionCryptoBaseUnit,
    })
  }, [actorRef, supplyPositionCryptoBaseUnit, isLoading])
}
