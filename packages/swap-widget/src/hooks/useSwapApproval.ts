import { useEffect, useRef } from 'react'
import type { WalletClient } from 'viem'
import { createPublicClient, encodeFunctionData, erc20Abi, http } from 'viem'

import { getBaseAsset } from '../constants/chains'
import { switchOrAddChain, VIEM_CHAINS_BY_ID } from '../constants/viemChains'
import { useSwapWallet } from '../contexts/SwapWalletContext'
import { SwapMachineCtx } from '../machines/SwapMachineContext'
import { getEvmNetworkId } from '../types'
import { getErrorMessage } from '../utils/errors'

export const useSwapApproval = () => {
  const stateValue = SwapMachineCtx.useSelector(s => s.value)
  const actorRef = SwapMachineCtx.useActorRef()

  const { evm } = useSwapWallet()
  const { walletClient, address: walletAddress } = evm

  const approvingRef = useRef(false)

  useEffect(() => {
    if (stateValue !== 'approving' || approvingRef.current) return
    approvingRef.current = true

    const executeApproval = async () => {
      try {
        if (!walletClient || !walletAddress) {
          actorRef.send({ type: 'APPROVAL_ERROR', error: 'No wallet connected' })
          return
        }

        const { quote, sellAsset, sellAmountBaseUnit } = actorRef.getSnapshot().context

        if (!quote?.approval?.spender) {
          actorRef.send({ type: 'APPROVAL_ERROR', error: 'No approval data in quote' })
          return
        }

        const sellAssetAddress = sellAsset.assetId.split('/')[1]?.split(':')[1]
        if (!sellAssetAddress || !/^0x[a-fA-F0-9]{40}$/.test(sellAssetAddress)) {
          actorRef.send({
            type: 'APPROVAL_ERROR',
            error: 'Approval not applicable for native assets',
          })
          return
        }

        if (!sellAmountBaseUnit || sellAmountBaseUnit === '0') {
          actorRef.send({ type: 'APPROVAL_ERROR', error: 'No sell amount specified' })
          return
        }

        // The API supplies ready-to-sign exact approvals in broadcast order, including a
        // preceding approve(spender, 0) for tokens that require resetting a non-zero allowance
        // (e.g. USDT); the local encode covers API versions predating approvalTxs
        const approvalTxs = quote.approval.approvalTxs?.length
          ? quote.approval.approvalTxs
          : [
              {
                to: sellAssetAddress,
                data: encodeFunctionData({
                  abi: erc20Abi,
                  functionName: 'approve',
                  args: [quote.approval.spender as `0x${string}`, BigInt(sellAmountBaseUnit)],
                }),
                value: '0',
              },
            ]

        const requiredChainId = getEvmNetworkId(sellAsset.chainId)
        const client = walletClient as WalletClient

        const currentChainId = await client.getChainId()
        if (currentChainId !== requiredChainId) {
          await switchOrAddChain(client, requiredChainId)
        }

        const baseAsset = getBaseAsset(sellAsset.chainId)
        const nativeCurrency = baseAsset
          ? { name: baseAsset.name, symbol: baseAsset.symbol, decimals: baseAsset.precision }
          : { name: 'ETH', symbol: 'ETH', decimals: 18 }

        const viemChain = VIEM_CHAINS_BY_ID[requiredChainId]
        const chain = viemChain ?? {
          id: requiredChainId,
          name: baseAsset?.networkName ?? baseAsset?.name ?? 'Chain',
          nativeCurrency,
          rpcUrls: { default: { http: [] } },
        }

        const rpcUrl = chain.rpcUrls?.default?.http?.[0]
        const publicClient = createPublicClient({
          chain,
          transport: rpcUrl ? http(rpcUrl) : http(),
        })

        let approvalHash: `0x${string}` | undefined
        for (const approvalTx of approvalTxs) {
          approvalHash = await client.sendTransaction({
            to: approvalTx.to as `0x${string}`,
            data: approvalTx.data as `0x${string}`,
            value: BigInt(approvalTx.value),
            chain,
            account: walletAddress as `0x${string}`,
          })
          await publicClient.waitForTransactionReceipt({ hash: approvalHash })
        }

        if (!approvalHash) throw new Error('No approval transactions to broadcast')

        actorRef.send({ type: 'APPROVAL_SUCCESS', txHash: approvalHash })
      } catch (error) {
        actorRef.send({
          type: 'APPROVAL_ERROR',
          error: getErrorMessage(error, 'Approval failed'),
        })
      } finally {
        approvingRef.current = false
      }
    }

    executeApproval()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-fire on state machine transitions; wallet handles close over the latest render
  }, [stateValue])
}
