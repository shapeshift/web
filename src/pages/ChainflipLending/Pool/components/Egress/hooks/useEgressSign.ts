import { useEffect, useMemo, useRef } from 'react'

import { EgressMachineCtx } from '../EgressMachineContext'

import { useWallet } from '@/hooks/useWallet/useWallet'
import { CHAINFLIP_LENDING_ASSET_BY_ASSET_ID } from '@/lib/chainflip/constants'
import { encodeWithdrawAsset } from '@/lib/chainflip/scale'
import { useChainflipLendingAccount } from '@/pages/ChainflipLending/ChainflipLendingAccountContext'
import { useSignChainflipCall } from '@/pages/ChainflipLending/hooks/useSignChainflipCall'

export const useEgressSign = () => {
  const actorRef = EgressMachineCtx.useActorRef()
  const stateValue = EgressMachineCtx.useSelector(s => s.value)
  const lastUsedNonce = EgressMachineCtx.useSelector(s => s.context.lastUsedNonce)
  const isNativeWallet = EgressMachineCtx.useSelector(s => s.context.isNativeWallet)
  const stepConfirmed = EgressMachineCtx.useSelector(s => s.context.stepConfirmed)
  const egressAmountCryptoBaseUnit = EgressMachineCtx.useSelector(
    s => s.context.egressAmountCryptoBaseUnit,
  )
  const destinationAddress = EgressMachineCtx.useSelector(s => s.context.destinationAddress)
  const assetId = EgressMachineCtx.useSelector(s => s.context.assetId)

  const wallet = useWallet().state.wallet
  const { scAccount } = useChainflipLendingAccount()
  const { signAndSubmit } = useSignChainflipCall()
  const executingRef = useRef(false)

  const cfAsset = useMemo(() => CHAINFLIP_LENDING_ASSET_BY_ASSET_ID[assetId], [assetId])

  useEffect(() => {
    if (stateValue !== 'signing' || executingRef.current) return
    if (isNativeWallet && !stepConfirmed) return
    executingRef.current = true

    const execute = async () => {
      try {
        if (!wallet) throw new Error('Wallet not connected')
        if (!scAccount) throw new Error('State Chain account not derived')
        if (!cfAsset) throw new Error(`Unsupported asset: ${assetId}`)

        const encodedCall = encodeWithdrawAsset(egressAmountCryptoBaseUnit, cfAsset, {
          chain: cfAsset.chain,
          address: destinationAddress,
        })
        const nonceOrAccount = lastUsedNonce !== undefined ? lastUsedNonce + 1 : scAccount

        const { txHash, nonce } = await signAndSubmit({
          encodedCall,
          nonceOrAccount,
        })

        actorRef.send({ type: 'SIGN_BROADCASTED', txHash, nonce })
        actorRef.send({ type: 'SIGN_SUCCESS' })
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Withdraw asset egress failed'
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
    assetId,
    cfAsset,
    egressAmountCryptoBaseUnit,
    destinationAddress,
    lastUsedNonce,
    signAndSubmit,
    isNativeWallet,
    stepConfirmed,
  ])
}
