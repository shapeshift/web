import { ethChainId, fromAccountId } from '@shapeshiftoss/caip'
import { CONTRACT_INTERACTION } from '@shapeshiftoss/chain-adapters'
import { assertGetViemClient } from '@shapeshiftoss/contracts'
import { useEffect, useRef } from 'react'
import type { Hash } from 'viem'
import { encodeFunctionData } from 'viem'

import { DepositMachineCtx } from '../DepositMachineContext'

import { useWallet } from '@/hooks/useWallet/useWallet'
import { ethAddressToNodeId } from '@/lib/chainflip/account'
import {
  CHAINFLIP_GATEWAY_ABI,
  CHAINFLIP_GATEWAY_CONTRACT_ADDRESS,
} from '@/lib/chainflip/constants'
import {
  assertGetEvmChainAdapter,
  buildAndBroadcast,
  createBuildCustomTxInput,
} from '@/lib/utils/evm'
import { useChainflipLendingAccount } from '@/pages/ChainflipLending/ChainflipLendingAccountContext'

export const useDepositFunding = () => {
  const actorRef = DepositMachineCtx.useActorRef()
  const stateValue = DepositMachineCtx.useSelector(s => s.value)
  const flipFundingAmountCryptoBaseUnit = DepositMachineCtx.useSelector(
    s => s.context.flipFundingAmountCryptoBaseUnit,
  )
  const isNativeWallet = DepositMachineCtx.useSelector(s => s.context.isNativeWallet)
  const stepConfirmed = DepositMachineCtx.useSelector(s => s.context.stepConfirmed)
  const wallet = useWallet().state.wallet
  const { accountId, accountNumber } = useChainflipLendingAccount()
  const executingRef = useRef(false)

  useEffect(() => {
    if (stateValue !== 'funding_account' || executingRef.current) return
    if (isNativeWallet && !stepConfirmed) return
    executingRef.current = true

    const execute = async () => {
      try {
        if (!wallet) throw new Error('Wallet not connected')
        if (!accountId) throw new Error('Account not found')

        const { account: from } = fromAccountId(accountId)
        const adapter = assertGetEvmChainAdapter(ethChainId)
        const nodeId = ethAddressToNodeId(from)

        const data = encodeFunctionData({
          abi: CHAINFLIP_GATEWAY_ABI,
          functionName: 'fundStateChainAccount',
          args: [nodeId, BigInt(flipFundingAmountCryptoBaseUnit)],
        })

        const buildCustomTxInput = await createBuildCustomTxInput({
          accountNumber,
          from,
          adapter,
          data,
          to: CHAINFLIP_GATEWAY_CONTRACT_ADDRESS,
          value: '0',
          wallet,
        })

        const txHash = await buildAndBroadcast({
          adapter,
          buildCustomTxInput,
          receiverAddress: CONTRACT_INTERACTION,
        })

        actorRef.send({ type: 'FUNDING_BROADCASTED', txHash })

        const publicClient = assertGetViemClient(ethChainId)
        await publicClient.waitForTransactionReceipt({ hash: txHash as Hash })

        actorRef.send({ type: 'FUNDING_SUCCESS' })
      } catch (e) {
        const message = e instanceof Error ? e.message : 'State Chain funding failed'
        actorRef.send({ type: 'FUNDING_ERROR', error: message })
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
    accountNumber,
    flipFundingAmountCryptoBaseUnit,
    isNativeWallet,
    stepConfirmed,
  ])
}
