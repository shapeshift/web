import { flipAssetId, fromAccountId } from '@shapeshiftoss/caip'
import { useEffect, useRef } from 'react'

import { DepositMachineCtx } from '../DepositMachineContext'

import { useWallet } from '@/hooks/useWallet/useWallet'
import { CHAINFLIP_GATEWAY_CONTRACT_ADDRESS } from '@/lib/chainflip/constants'
import { approve } from '@/lib/utils/evm/approve'
import { useChainflipLendingAccount } from '@/pages/ChainflipLending/ChainflipLendingAccountContext'

export const useDepositApproval = () => {
  const actorRef = DepositMachineCtx.useActorRef()
  const stateValue = DepositMachineCtx.useSelector(s => s.value)
  const flipFundingAmountCryptoBaseUnit = DepositMachineCtx.useSelector(
    s => s.context.flipFundingAmountCryptoBaseUnit,
  )
  const wallet = useWallet().state.wallet
  const { accountId, accountNumber } = useChainflipLendingAccount()
  const executingRef = useRef(false)

  useEffect(() => {
    if (stateValue !== 'approving_flip' || executingRef.current) return
    executingRef.current = true

    const execute = async () => {
      try {
        if (!wallet) throw new Error('Wallet not connected')
        if (!accountId) throw new Error('Account not found')

        const { account: from } = fromAccountId(accountId)

        const txHash = await approve({
          assetId: flipAssetId,
          spender: CHAINFLIP_GATEWAY_CONTRACT_ADDRESS,
          amountCryptoBaseUnit: flipFundingAmountCryptoBaseUnit,
          wallet,
          accountNumber,
          from,
        })

        actorRef.send({ type: 'APPROVAL_SUCCESS', txHash })
      } catch (e) {
        const message = e instanceof Error ? e.message : 'FLIP approval failed'
        actorRef.send({ type: 'APPROVAL_ERROR', error: message })
      } finally {
        executingRef.current = false
      }
    }

    execute()
  }, [stateValue, actorRef, wallet, accountId, accountNumber, flipFundingAmountCryptoBaseUnit])
}
