import { useEffect, useRef } from 'react'

import { DepositMachineCtx } from '../DepositMachineContext'

import { useWallet } from '@/hooks/useWallet/useWallet'
import { encodeRegisterLpAccount } from '@/lib/chainflip/scale'
import { useChainflipLendingAccount } from '@/pages/ChainflipLending/ChainflipLendingAccountContext'
import { useSignChainflipCall } from '@/pages/ChainflipLending/hooks/useSignChainflipCall'

export const useDepositRegistration = () => {
  const actorRef = DepositMachineCtx.useActorRef()
  const stateValue = DepositMachineCtx.useSelector(s => s.value)
  const lastUsedNonce = DepositMachineCtx.useSelector(s => s.context.lastUsedNonce)
  const wallet = useWallet().state.wallet
  const { accountId, scAccount } = useChainflipLendingAccount()
  const { signAndSubmit } = useSignChainflipCall()
  const executingRef = useRef(false)

  useEffect(() => {
    if (stateValue !== 'registering' || executingRef.current) return
    executingRef.current = true

    const execute = async () => {
      try {
        if (!wallet) throw new Error('Wallet not connected')
        if (!accountId) throw new Error('Account not found')
        if (!scAccount) throw new Error('State Chain account not derived')

        const encodedCall = encodeRegisterLpAccount()
        const nonceOrAccount = lastUsedNonce !== undefined ? lastUsedNonce + 1 : scAccount

        const { txHash, nonce } = await signAndSubmit({
          encodedCall,
          nonceOrAccount,
        })

        actorRef.send({ type: 'REGISTRATION_BROADCASTED', txHash, nonce })
        actorRef.send({ type: 'REGISTRATION_SUCCESS' })
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Account registration failed'
        actorRef.send({ type: 'REGISTRATION_ERROR', error: message })
      } finally {
        executingRef.current = false
      }
    }

    execute()
  }, [stateValue, actorRef, wallet, accountId, scAccount, lastUsedNonce, signAndSubmit])
}
