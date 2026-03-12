import { useEffect, useRef } from 'react'

import { RepayMachineCtx } from '../RepayMachineContext'

import { useWallet } from '@/hooks/useWallet/useWallet'
import { encodeMakeRepayment } from '@/lib/chainflip/scale'
import { useChainflipLendingAccount } from '@/pages/ChainflipLending/ChainflipLendingAccountContext'
import { useSignChainflipCall } from '@/pages/ChainflipLending/hooks/useSignChainflipCall'

export const useRepaySign = () => {
  const actorRef = RepayMachineCtx.useActorRef()
  const stateValue = RepayMachineCtx.useSelector(s => s.value)
  const lastUsedNonce = RepayMachineCtx.useSelector(s => s.context.lastUsedNonce)
  const isNativeWallet = RepayMachineCtx.useSelector(s => s.context.isNativeWallet)
  const stepConfirmed = RepayMachineCtx.useSelector(s => s.context.stepConfirmed)
  const repayAmountCryptoBaseUnit = RepayMachineCtx.useSelector(
    s => s.context.repayAmountCryptoBaseUnit,
  )
  const loanId = RepayMachineCtx.useSelector(s => s.context.loanId)
  const isFullRepayment = RepayMachineCtx.useSelector(s => s.context.isFullRepayment)

  const wallet = useWallet().state.wallet
  const { scAccount } = useChainflipLendingAccount()
  const { signAndSubmit } = useSignChainflipCall()
  const executingRef = useRef(false)

  useEffect(() => {
    if (stateValue !== 'signing' || executingRef.current) return
    if (isNativeWallet && !stepConfirmed) return
    executingRef.current = true

    const execute = async () => {
      try {
        if (!wallet) throw new Error('Wallet not connected')
        if (!scAccount) throw new Error('State Chain account not derived')

        const encodedCall = isFullRepayment
          ? encodeMakeRepayment(loanId, 'full')
          : encodeMakeRepayment(loanId, repayAmountCryptoBaseUnit)

        const nonceOrAccount = lastUsedNonce !== undefined ? lastUsedNonce + 1 : scAccount

        const { txHash, nonce } = await signAndSubmit({
          encodedCall,
          nonceOrAccount,
        })

        actorRef.send({ type: 'SIGN_BROADCASTED', txHash, nonce })
        actorRef.send({ type: 'SIGN_SUCCESS' })
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Repayment transaction failed'
        actorRef.send({ type: 'SIGN_ERROR', error: message })
      } finally {
        executingRef.current = false
      }
    }

    execute()
  }, [
    stateValue,
    actorRef,
    wallet,
    scAccount,
    lastUsedNonce,
    signAndSubmit,
    isNativeWallet,
    stepConfirmed,
    loanId,
    isFullRepayment,
    repayAmountCryptoBaseUnit,
  ])
}
