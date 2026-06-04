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

        if (!sellAmountBaseUnit || sellAmountBaseUnit === '0') {
          actorRef.send({ type: 'APPROVAL_ERROR', error: 'No sell amount specified' })
          return
        }

        const approvalData = encodeFunctionData({
          abi: erc20Abi,
          functionName: 'approve',
          args: [quote.approval.spender as `0x${string}`, BigInt(sellAmountBaseUnit)],
        })

        const approvalHash = await client.sendTransaction({
          to: sellAssetAddress as `0x${string}`,
          data: approvalData,
          value: BigInt(0),
          chain,
          account: walletAddress as `0x${string}`,
        })

        const rpcUrl = chain.rpcUrls?.default?.http?.[0]
        const publicClient = createPublicClient({
          chain,
          transport: rpcUrl ? http(rpcUrl) : http(),
        })
        await publicClient.waitForTransactionReceipt({ hash: approvalHash })

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
