import { useEffect, useMemo, useRef } from 'react'

import { WithdrawMachineCtx } from '../WithdrawMachineContext'

import { useWallet } from '@/hooks/useWallet/useWallet'
import { CHAINFLIP_LENDING_ASSET_BY_ASSET_ID } from '@/lib/chainflip/constants'
import { encodeBatch, encodeRemoveLenderFunds, encodeWithdrawAsset } from '@/lib/chainflip/scale'
import { useChainflipLendingAccount } from '@/pages/ChainflipLending/ChainflipLendingAccountContext'
import { useSignChainflipCall } from '@/pages/ChainflipLending/hooks/useSignChainflipCall'

export const useWithdrawBatch = () => {
  const actorRef = WithdrawMachineCtx.useActorRef()
  const stateValue = WithdrawMachineCtx.useSelector(s => s.value)
  const {
    assetId,
    withdrawAmountCryptoBaseUnit,
    isFullWithdrawal,
    withdrawAddress,
    lastUsedNonce,
    isNativeWallet,
    stepConfirmed,
  } = WithdrawMachineCtx.useSelector(s => ({
    assetId: s.context.assetId,
    withdrawAmountCryptoBaseUnit: s.context.withdrawAmountCryptoBaseUnit,
    isFullWithdrawal: s.context.isFullWithdrawal,
    withdrawAddress: s.context.withdrawAddress,
    lastUsedNonce: s.context.lastUsedNonce,
    isNativeWallet: s.context.isNativeWallet,
    stepConfirmed: s.context.stepConfirmed,
  }))
  const wallet = useWallet().state.wallet
  const { accountId, scAccount } = useChainflipLendingAccount()
  const { signAndSubmit } = useSignChainflipCall()
  const executingRef = useRef(false)

  const cfAsset = useMemo(() => CHAINFLIP_LENDING_ASSET_BY_ASSET_ID[assetId], [assetId])

  useEffect(() => {
    if (stateValue !== 'signing_batch' || executingRef.current) return
    if (isNativeWallet && !stepConfirmed) return
    executingRef.current = true

    const execute = async () => {
      try {
        if (!wallet) throw new Error('Wallet not connected')
        if (!accountId) throw new Error('Account not found')
        if (!scAccount) throw new Error('State Chain account not derived')
        if (!cfAsset) throw new Error(`Unsupported asset: ${assetId}`)

        const removeCall = encodeRemoveLenderFunds(
          cfAsset,
          isFullWithdrawal ? null : withdrawAmountCryptoBaseUnit,
        )
        const egressCall = encodeWithdrawAsset(withdrawAmountCryptoBaseUnit, cfAsset, {
          chain: cfAsset.chain,
          address: withdrawAddress,
        })
        const encodedCall = encodeBatch([removeCall, egressCall])
        const nonceOrAccount = lastUsedNonce !== undefined ? lastUsedNonce + 1 : scAccount

        const { txHash, nonce } = await signAndSubmit({
          encodedCall,
          nonceOrAccount,
        })

        actorRef.send({ type: 'BATCH_BROADCASTED', txHash, nonce })
        actorRef.send({ type: 'BATCH_SUCCESS' })
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Batch withdrawal failed'
        actorRef.send({ type: 'BATCH_ERROR', error: message })
      } finally {
        executingRef.current = false
      }
    }

    execute()
  }, [
    stateValue,
    actorRef,
    wallet,
    accountId,
    scAccount,
    assetId,
    cfAsset,
    withdrawAmountCryptoBaseUnit,
    withdrawAddress,
    lastUsedNonce,
    signAndSubmit,
    isFullWithdrawal,
    isNativeWallet,
    stepConfirmed,
  ])
}
