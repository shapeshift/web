import { useEffect, useRef } from 'react'

import { DepositMachineCtx } from '../DepositMachineContext'

import { useWallet } from '@/hooks/useWallet/useWallet'
import { encodeRegisterLiquidityRefundAddress } from '@/lib/chainflip/scale'
import { useChainflipLendingAccount } from '@/pages/ChainflipLending/ChainflipLendingAccountContext'
import { useSignChainflipCall } from '@/pages/ChainflipLending/hooks/useSignChainflipCall'

export const useDepositRefundAddress = () => {
  const actorRef = DepositMachineCtx.useActorRef()
  const stateValue = DepositMachineCtx.useSelector(s => s.value)
  const refundAddress = DepositMachineCtx.useSelector(s => s.context.refundAddress)
  const lastUsedNonce = DepositMachineCtx.useSelector(s => s.context.lastUsedNonce)
  const isNativeWallet = DepositMachineCtx.useSelector(s => s.context.isNativeWallet)
  const stepConfirmed = DepositMachineCtx.useSelector(s => s.context.stepConfirmed)
  const wallet = useWallet().state.wallet
  const { accountId, scAccount } = useChainflipLendingAccount()
  const { signAndSubmit } = useSignChainflipCall()
  const executingRef = useRef(false)

  useEffect(() => {
    if (stateValue !== 'setting_refund_address' || executingRef.current) return
    if (isNativeWallet && !stepConfirmed) return
    executingRef.current = true

    const execute = async () => {
      try {
        if (!wallet) throw new Error('Wallet not connected')
        if (!accountId) throw new Error('Account not found')
        if (!scAccount) throw new Error('State Chain account not derived')
        if (!refundAddress) throw new Error('Refund address not set')

        const encodedCall = encodeRegisterLiquidityRefundAddress({
          chain: 'Ethereum',
          address: refundAddress,
        })

        const nonceOrAccount = lastUsedNonce !== undefined ? lastUsedNonce + 1 : scAccount

        const { txHash, nonce } = await signAndSubmit({
          encodedCall,
          nonceOrAccount,
        })

        actorRef.send({ type: 'REFUND_ADDRESS_BROADCASTED', txHash, nonce })
        actorRef.send({ type: 'REFUND_ADDRESS_SUCCESS' })
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Failed to set refund address'
        actorRef.send({ type: 'REFUND_ADDRESS_ERROR', error: message })
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
    refundAddress,
    lastUsedNonce,
    signAndSubmit,
    isNativeWallet,
    stepConfirmed,
  ])
}
