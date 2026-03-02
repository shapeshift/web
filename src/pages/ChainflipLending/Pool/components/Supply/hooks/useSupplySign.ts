import { useEffect, useRef } from 'react'

import { SupplyMachineCtx } from '../SupplyMachineContext'

import { useWallet } from '@/hooks/useWallet/useWallet'
import { CHAINFLIP_LENDING_ASSET_BY_ASSET_ID } from '@/lib/chainflip/constants'
import { encodeAddLenderFunds } from '@/lib/chainflip/scale'
import { useChainflipLendingAccount } from '@/pages/ChainflipLending/ChainflipLendingAccountContext'
import { useSignChainflipCall } from '@/pages/ChainflipLending/hooks/useSignChainflipCall'

export const useSupplySign = () => {
  const actorRef = SupplyMachineCtx.useActorRef()
  const stateValue = SupplyMachineCtx.useSelector(s => s.value)
  const lastUsedNonce = SupplyMachineCtx.useSelector(s => s.context.lastUsedNonce)
  const isNativeWallet = SupplyMachineCtx.useSelector(s => s.context.isNativeWallet)
  const stepConfirmed = SupplyMachineCtx.useSelector(s => s.context.stepConfirmed)
  const supplyAmountCryptoBaseUnit = SupplyMachineCtx.useSelector(
    s => s.context.supplyAmountCryptoBaseUnit,
  )
  const assetId = SupplyMachineCtx.useSelector(s => s.context.assetId)

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

        const cfAsset = CHAINFLIP_LENDING_ASSET_BY_ASSET_ID[assetId]
        if (!cfAsset) throw new Error('Unsupported asset')

        const encodedCall = encodeAddLenderFunds(cfAsset, supplyAmountCryptoBaseUnit)
        const nonceOrAccount = lastUsedNonce !== undefined ? lastUsedNonce + 1 : scAccount

        const { txHash, nonce } = await signAndSubmit({
          encodedCall,
          nonceOrAccount,
        })

        actorRef.send({ type: 'SIGN_BROADCASTED', txHash, nonce })
        actorRef.send({ type: 'SIGN_SUCCESS' })
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Supply transaction failed'
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
    assetId,
    supplyAmountCryptoBaseUnit,
  ])
}
