import { type AccountId, fromAccountId } from '@shapeshiftoss/caip'
import { CONTRACT_INTERACTION } from '@shapeshiftoss/chain-adapters'
import { KnownChainIds } from '@shapeshiftoss/types'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { outboxAbi } from 'contracts/abis/Outbox'
import { useMemo } from 'react'
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
import { selectBIP44ParamsByAccountId } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import type { ClaimDetails } from './useArbitrumClaimsByStatus'

const ARBITRUM_OUTBOX = '0x0B9857ae2D4A3DBe74ffE1d7DF045bb7F96E4840'

export const useArbitrumClaimTx = (
  claim: ClaimDetails,
  destinationAccountId: AccountId | undefined,
  setClaimTxHash: (txHash: string) => void,
  setClaimTxStatus: (txStatus: TxStatus) => void,
) => {
  const wallet = useWallet().state.wallet
  const queryClient = useQueryClient()

  const l2Provider = getEthersV5Provider(KnownChainIds.ArbitrumMainnet)

  const accountIdFilter = useMemo(() => {
    return { accountId: destinationAccountId }
  }, [destinationAccountId])

  const bip44Params = useAppSelector(state => selectBIP44ParamsByAccountId(state, accountIdFilter))

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
    pubKey: destinationAccountId ? fromAccountId(destinationAccountId).account : undefined,
    chainId: claim.destinationChainId,
    data: executeTransactionDataResult.data,
    refetchInterval: 15_000,
    to: getAddress(ARBITRUM_OUTBOX),
    value: '0',
  })

  const claimMutation = useMutation({
    mutationKey: ['claim', { txid: claim.tx.txid }],
    mutationFn: async () => {
      if (!wallet) return
      if (!bip44Params) return
      if (!executeTransactionDataResult.data) return
      if (!destinationAccountId) return

      const adapter = assertGetEvmChainAdapter(claim.destinationChainId)

      const buildCustomTxInput = await createBuildCustomTxInput({
        accountNumber: bip44Params.accountNumber,
        pubKey: fromAccountId(destinationAccountId).account,
        adapter,
        data: executeTransactionDataResult.data,
        to: ARBITRUM_OUTBOX,
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
