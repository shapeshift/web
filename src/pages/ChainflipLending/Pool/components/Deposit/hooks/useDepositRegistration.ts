import { fromAccountId } from '@shapeshiftoss/caip'
import { useEffect, useRef } from 'react'

import { DepositMachineCtx } from '../DepositMachineContext'

import { useWallet } from '@/hooks/useWallet/useWallet'
import {
  encodeBatch,
  encodeRegisterLiquidityRefundAddress,
  encodeRegisterLpAccount,
} from '@/lib/chainflip/scale'
import { useChainflipLendingAccount } from '@/pages/ChainflipLending/ChainflipLendingAccountContext'
import { useSignChainflipCall } from '@/pages/ChainflipLending/hooks/useSignChainflipCall'

export const useDepositRegistration = () => {
  const actorRef = DepositMachineCtx.useActorRef()
  const stateValue = DepositMachineCtx.useSelector(s => s.value)
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

        const { account: ethAddress } = fromAccountId(accountId)

        const registerLpCall = encodeRegisterLpAccount()
        const registerRefundCall = encodeRegisterLiquidityRefundAddress({
          chain: 'Ethereum',
          address: ethAddress,
        })

        const batchedCall = encodeBatch([registerLpCall, registerRefundCall])

        const { txHash } = await signAndSubmit({
          encodedCall: batchedCall,
          nonceOrAccount: scAccount,
        })

        actorRef.send({ type: 'REGISTRATION_SUCCESS', txHash })
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Account registration failed'
        actorRef.send({ type: 'REGISTRATION_ERROR', error: message })
      } finally {
        executingRef.current = false
      }
    }

    execute()
  }, [stateValue, actorRef, wallet, accountId, scAccount, signAndSubmit])
}
