import { useEffect, useRef } from 'react'

import { BorrowMachineCtx } from '../BorrowMachineContext'

import { useWallet } from '@/hooks/useWallet/useWallet'
import { CHAINFLIP_LENDING_ASSET_BY_ASSET_ID } from '@/lib/chainflip/constants'
import { encodeRequestLoan } from '@/lib/chainflip/scale'
import { useChainflipLendingAccount } from '@/pages/ChainflipLending/ChainflipLendingAccountContext'
import { useSignChainflipCall } from '@/pages/ChainflipLending/hooks/useSignChainflipCall'

export const useBorrowSign = () => {
  const actorRef = BorrowMachineCtx.useActorRef()
  const stateValue = BorrowMachineCtx.useSelector(s => s.value)
  const lastUsedNonce = BorrowMachineCtx.useSelector(s => s.context.lastUsedNonce)
  const isNativeWallet = BorrowMachineCtx.useSelector(s => s.context.isNativeWallet)
  const stepConfirmed = BorrowMachineCtx.useSelector(s => s.context.stepConfirmed)
  const borrowAmountCryptoBaseUnit = BorrowMachineCtx.useSelector(
    s => s.context.borrowAmountCryptoBaseUnit,
  )
  const assetId = BorrowMachineCtx.useSelector(s => s.context.assetId)

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

        const encodedCall = encodeRequestLoan(cfAsset, borrowAmountCryptoBaseUnit, null, [])
        const nonceOrAccount = lastUsedNonce !== undefined ? lastUsedNonce + 1 : scAccount

        const { txHash, nonce } = await signAndSubmit({
          encodedCall,
          nonceOrAccount,
        })

        actorRef.send({ type: 'SIGN_BROADCASTED', txHash, nonce })
        actorRef.send({ type: 'SIGN_SUCCESS' })
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Borrow transaction failed'
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
    borrowAmountCryptoBaseUnit,
  ])
}
