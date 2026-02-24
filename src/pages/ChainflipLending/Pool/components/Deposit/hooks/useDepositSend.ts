import { fromAccountId, fromAssetId } from '@shapeshiftoss/caip'
import { CONTRACT_INTERACTION } from '@shapeshiftoss/chain-adapters'
import { assertGetViemClient } from '@shapeshiftoss/contracts'
import { useEffect, useRef } from 'react'
import type { Hash } from 'viem'
import { encodeFunctionData, erc20Abi } from 'viem'

import { DepositMachineCtx } from '../DepositMachineContext'

import { useWallet } from '@/hooks/useWallet/useWallet'
import {
  assertGetEvmChainAdapter,
  buildAndBroadcast,
  createBuildCustomTxInput,
} from '@/lib/utils/evm'
import { useChainflipLendingAccount } from '@/pages/ChainflipLending/ChainflipLendingAccountContext'

export const useDepositSend = () => {
  const actorRef = DepositMachineCtx.useActorRef()
  const stateValue = DepositMachineCtx.useSelector(s => s.value)
  const { depositAddress, depositAmountCryptoBaseUnit, assetId } = DepositMachineCtx.useSelector(
    s => ({
      depositAddress: s.context.depositAddress,
      depositAmountCryptoBaseUnit: s.context.depositAmountCryptoBaseUnit,
      assetId: s.context.assetId,
    }),
  )
  const isNativeWallet = DepositMachineCtx.useSelector(s => s.context.isNativeWallet)
  const stepConfirmed = DepositMachineCtx.useSelector(s => s.context.stepConfirmed)
  const wallet = useWallet().state.wallet
  const { accountId, accountNumber } = useChainflipLendingAccount()
  const executingRef = useRef(false)

  useEffect(() => {
    if (stateValue !== 'sending_deposit' || executingRef.current) return
    if (isNativeWallet && !stepConfirmed) return
    executingRef.current = true

    const execute = async () => {
      try {
        if (!wallet) throw new Error('Wallet not connected')
        if (!accountId) throw new Error('Account not found')
        if (!depositAddress) throw new Error('Deposit address not set')

        const { account: from } = fromAccountId(accountId)
        const { assetNamespace, assetReference, chainId } = fromAssetId(assetId)
        const adapter = assertGetEvmChainAdapter(chainId)

        const isToken = assetNamespace === 'erc20'

        const txHash = await (() => {
          if (isToken) {
            const data = encodeFunctionData({
              abi: erc20Abi,
              functionName: 'transfer',
              args: [depositAddress as `0x${string}`, BigInt(depositAmountCryptoBaseUnit)],
            })

            return createBuildCustomTxInput({
              accountNumber,
              from,
              adapter,
              data,
              to: assetReference,
              value: '0',
              wallet,
            }).then(buildCustomTxInput =>
              buildAndBroadcast({
                adapter,
                buildCustomTxInput,
                receiverAddress: CONTRACT_INTERACTION,
              }),
            )
          }

          return createBuildCustomTxInput({
            accountNumber,
            from,
            adapter,
            data: '0x',
            to: depositAddress,
            value: depositAmountCryptoBaseUnit,
            wallet,
          }).then(buildCustomTxInput =>
            buildAndBroadcast({
              adapter,
              buildCustomTxInput,
              receiverAddress: depositAddress,
            }),
          )
        })()

        actorRef.send({ type: 'SEND_BROADCASTED', txHash })

        const publicClient = assertGetViemClient(chainId)
        await publicClient.waitForTransactionReceipt({ hash: txHash as Hash })

        actorRef.send({ type: 'SEND_SUCCESS' })
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Deposit send failed'
        actorRef.send({ type: 'SEND_ERROR', error: message })
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
    depositAddress,
    depositAmountCryptoBaseUnit,
    assetId,
    isNativeWallet,
    stepConfirmed,
  ])
}
