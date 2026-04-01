import { useEffect, useRef } from 'react'

import { VoluntaryLiquidationMachineCtx } from '../VoluntaryLiquidationMachineContext'

import { useWallet } from '@/hooks/useWallet/useWallet'
import {
  encodeInitiateVoluntaryLiquidation,
  encodeStopVoluntaryLiquidation,
} from '@/lib/chainflip/scale'
import { useChainflipLendingAccount } from '@/pages/ChainflipLending/ChainflipLendingAccountContext'
import { useSignChainflipCall } from '@/pages/ChainflipLending/hooks/useSignChainflipCall'

export const useVoluntaryLiquidationSign = () => {
  const actorRef = VoluntaryLiquidationMachineCtx.useActorRef()
  const stateValue = VoluntaryLiquidationMachineCtx.useSelector(s => s.value)
  const lastUsedNonce = VoluntaryLiquidationMachineCtx.useSelector(s => s.context.lastUsedNonce)
  const isNativeWallet = VoluntaryLiquidationMachineCtx.useSelector(s => s.context.isNativeWallet)
  const stepConfirmed = VoluntaryLiquidationMachineCtx.useSelector(s => s.context.stepConfirmed)
  const action = VoluntaryLiquidationMachineCtx.useSelector(s => s.context.action)

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

        const encodedCall =
          action === 'initiate'
            ? encodeInitiateVoluntaryLiquidation()
            : encodeStopVoluntaryLiquidation()

        const nonceOrAccount = lastUsedNonce !== undefined ? lastUsedNonce + 1 : scAccount

        const { txHash, nonce } = await signAndSubmit({
          encodedCall,
          nonceOrAccount,
        })

        actorRef.send({ type: 'SIGN_BROADCASTED', txHash, nonce })
        actorRef.send({ type: 'SIGN_SUCCESS' })
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Voluntary liquidation transaction failed'
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
    action,
  ])
}
