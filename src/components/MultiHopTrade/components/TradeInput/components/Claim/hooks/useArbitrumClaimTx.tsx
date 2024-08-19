import { ethChainId } from '@shapeshiftoss/caip'
import { CONTRACT_INTERACTION } from '@shapeshiftoss/chain-adapters'
import { KnownChainIds } from '@shapeshiftoss/types'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { outboxAbi } from 'contracts/abis/Outbox'
import type { Hash } from 'viem'
import { encodeFunctionData, getAddress } from 'viem'
import { useEvmFees } from 'hooks/queries/useEvmFees'
import { useWallet } from 'hooks/useWallet/useWallet'
import { getEthersV5Provider } from 'lib/ethersProviderSingleton'
import {
  assertGetEvmChainAdapter,
  buildAndBroadcast,
  createBuildCustomTxInput,
} from 'lib/utils/evm'
import { assertGetViemClient } from 'lib/viem-client'

import type { ClaimDetails } from './useArbitrumClaimsByStatus'

export const useArbitrumClaimTx = (
  claim: ClaimDetails,
  setClaimTxHash: (txHash: string) => void,
  setClaimTxStatus: (txStatus: TxStatus) => void,
) => {
  const wallet = useWallet().state.wallet
  const queryClient = useQueryClient()

  const l2Provider = getEthersV5Provider(KnownChainIds.ArbitrumMainnet)

  const executeTransactionDataResult = useQuery({
    queryKey: ['executeTransactionData', { txid: claim.tx.txid }],
    queryFn: async () => {
      const { event, message } = claim

      const proof = await message.getOutboxProof(l2Provider)

      if (!('position' in event)) return

      // nitro transaction
      return encodeFunctionData({
        abi: outboxAbi,
        functionName: 'executeTransaction',
        args: [
          proof,
          event.position,
          event.caller,
          event.destination,
          event.arbBlockNum,
          event.ethBlockNum,
          event.timestamp,
          event.callvalue,
          event.data,
        ],
      })
    },
  })

  const evmFeesResult = useEvmFees({
    accountNumber: 0,
    chainId: ethChainId,
    data: executeTransactionDataResult.data,
    refetchInterval: 15_000,
    to: getAddress('0x0B9857ae2D4A3DBe74ffE1d7DF045bb7F96E4840'),
    value: '0',
  })

  const claimMutation = useMutation({
    mutationKey: ['claim', { txid: claim.tx.txid }],
    mutationFn: async () => {
      if (!wallet) return
      if (!executeTransactionDataResult.data) return

      const adapter = assertGetEvmChainAdapter(ethChainId)

      const buildCustomTxInput = await createBuildCustomTxInput({
        accountNumber: 0,
        adapter,
        data: executeTransactionDataResult.data,
        to: '0x0B9857ae2D4A3DBe74ffE1d7DF045bb7F96E4840',
        value: '0',
        wallet,
      })

      const txHash = await buildAndBroadcast({
        adapter,
        buildCustomTxInput,
        receiverAddress: CONTRACT_INTERACTION,
      })

      return txHash
    },
    onMutate() {
      setClaimTxStatus(TxStatus.Pending)
    },
    onSuccess(txHash) {
      if (!txHash) {
        setClaimTxStatus(TxStatus.Failed)
        return
      }

      setClaimTxHash(txHash)

      const checkStatus = async () => {
        const publicClient = assertGetViemClient(claim.destinationChainId)
        const { status } = await publicClient.waitForTransactionReceipt({ hash: txHash as Hash })

        switch (status) {
          case 'success': {
            queryClient.setQueryData(['claimStatus', { txid: claim.tx.txid }], () => null)
            return setClaimTxStatus(TxStatus.Confirmed)
          }
          case 'reverted':
          default:
            return setClaimTxStatus(TxStatus.Failed)
        }
      }

      checkStatus()
    },
    onError() {
      setClaimTxStatus(TxStatus.Failed)
    },
    onSettled() {
      queryClient.invalidateQueries({
        queryKey: ['claimStatus', { txid: claim.tx.txid }],
        refetchType: 'all',
      })
    },
  })

  return {
    evmFeesResult,
    claimMutation,
  }
}
