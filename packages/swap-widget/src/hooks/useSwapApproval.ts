import { useEffect, useRef } from 'react'
import type { WalletClient } from 'viem'
import { createPublicClient, encodeFunctionData, erc20Abi, http } from 'viem'

import { getBaseAsset } from '../constants/chains'
import { switchOrAddChain, VIEM_CHAINS_BY_ID } from '../constants/viemChains'
import { useSwapWallet } from '../contexts/SwapWalletContext'
import { SwapMachineCtx } from '../machines/SwapMachineContext'
import { getEvmNetworkId } from '../types'

export const useSwapApproval = () => {
  const stateValue = SwapMachineCtx.useSelector(s => s.value)
  const context = SwapMachineCtx.useSelector(s => s.context)
  const actorRef = SwapMachineCtx.useActorRef()

  const { walletClient, walletAddress } = useSwapWallet()

  const approvingRef = useRef(false)

  useEffect(() => {
    const snap = actorRef.getSnapshot()
    if (!snap.matches('approving') || approvingRef.current) return
    approvingRef.current = true

    const executeApproval = async () => {
      try {
        if (!walletClient || !walletAddress) {
          actorRef.send({ type: 'APPROVAL_ERROR', error: 'No wallet connected' })
          return
        }

        const quote = context.quote
        if (!quote?.approval?.spender) {
          actorRef.send({ type: 'APPROVAL_ERROR', error: 'No approval data in quote' })
          return
        }

        const sellAssetAddress = context.sellAsset.assetId.split('/')[1]?.split(':')[1]
        if (!sellAssetAddress || !/^0x[a-fA-F0-9]{40}$/.test(sellAssetAddress)) {
          actorRef.send({
            type: 'APPROVAL_ERROR',
            error: 'Approval not applicable for native assets',
          })
          return
        }

        const requiredChainId = getEvmNetworkId(context.sellAsset.chainId)
        const client = walletClient as WalletClient

        const currentChainId = await client.getChainId()
        if (currentChainId !== requiredChainId) {
          await switchOrAddChain(client, requiredChainId)
        }

        const baseAsset = getBaseAsset(context.sellAsset.chainId)
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

        const approvalData = encodeFunctionData({
          abi: erc20Abi,
          functionName: 'approve',
          args: [
            quote.approval.spender as `0x${string}`,
            BigInt(context.sellAmountBaseUnit ?? '0'),
          ],
        })

        const approvalHash = await client.sendTransaction({
          to: sellAssetAddress as `0x${string}`,
          data: approvalData,
          value: BigInt(0),
          chain,
          account: walletAddress as `0x${string}`,
        })

        const publicClient = createPublicClient({ chain, transport: http() })
        await publicClient.waitForTransactionReceipt({ hash: approvalHash })

        actorRef.send({ type: 'APPROVAL_SUCCESS', txHash: approvalHash })
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Approval failed'
        actorRef.send({ type: 'APPROVAL_ERROR', error: errorMessage })
      } finally {
        approvingRef.current = false
      }
    }

    executeApproval()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stateValue])
}
