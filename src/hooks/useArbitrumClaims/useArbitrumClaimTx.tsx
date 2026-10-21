import type { AccountId } from '@shapeshiftoss/caip'
import { fromAccountId } from '@shapeshiftoss/caip'
import { CONTRACT_INTERACTION } from '@shapeshiftoss/chain-adapters'
import { ARB_OUTBOX_ABI, getEthersV5Provider } from '@shapeshiftoss/contracts'
import { KnownChainIds } from '@shapeshiftoss/types'
import { skipToken, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'
import type { Address, Hex } from 'viem'
import { encodeFunctionData, getAddress } from 'viem'

import type { ClaimDetails } from './useArbitrumClaims'
import { arbitrumNetwork } from './useArbitrumClaims'

import { useEvmFees } from '@/hooks/queries/useEvmFees'
import { useWallet } from '@/hooks/useWallet/useWallet'
import {
  assertGetEvmChainAdapter,
  buildAndBroadcast,
  createBuildCustomTxInput,
} from '@/lib/utils/evm'
import { selectBip44ParamsByAccountId } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

export const useArbitrumClaimTx = (
  claim: ClaimDetails | undefined,
  claimAccountId: AccountId | undefined,
  onClaimBroadcast: (claimTxHash: string) => void,
) => {
  const wallet = useWallet().state.wallet
  const queryClient = useQueryClient()

  const l2Provider = getEthersV5Provider(KnownChainIds.ArbitrumMainnet)

  const accountIdFilter = useMemo(() => {
    return { accountId: claimAccountId }
  }, [claimAccountId])

  const bip44Params = useAppSelector(state => selectBip44ParamsByAccountId(state, accountIdFilter))

  const executeTransactionDataResult = useQuery({
    queryKey: ['executeTransactionData', { txid: claim?.withdrawTxHash }],
    queryFn: claim
      ? async () => {
          const { event, message } = claim

          const proof = (await message.getOutboxProof(l2Provider)) as Hex[]

          return encodeFunctionData({
            abi: ARB_OUTBOX_ABI,
            functionName: 'executeTransaction',
            args: [
              proof,
              event.position.toBigInt(),
              event.caller as Address,
              event.destination as Address,
              event.arbBlockNum.toBigInt(),
              event.ethBlockNum.toBigInt(),
              event.timestamp.toBigInt(),
              event.callvalue.toBigInt(),
              event.data as Hex,
            ],
          })
        }
      : skipToken,
  })

  const evmFeesResult = useEvmFees({
    from: claimAccountId ? fromAccountId(claimAccountId).account : undefined,
    chainId: claim?.destinationChainId,
    data: executeTransactionDataResult.data,
    refetchInterval: 15_000,
    to: getAddress(arbitrumNetwork.ethBridge.outbox),
    value: '0',
  })

  const claimMutation = useMutation({
    mutationKey: ['claim', { txid: claim?.withdrawTxHash }],
    mutationFn: async () => {
      if (!claim || !claimAccountId || !executeTransactionDataResult.data) {
        throw new Error('Claim not ready')
      }
      if (!wallet || !bip44Params) {
        throw new Error(`Wallet has no account for ${claimAccountId}`)
      }

      const adapter = assertGetEvmChainAdapter(claim.destinationChainId)

      const buildCustomTxInput = await createBuildCustomTxInput({
        accountNumber: bip44Params.accountNumber,
        from: fromAccountId(claimAccountId).account,
        adapter,
        data: executeTransactionDataResult.data,
        to: arbitrumNetwork.ethBridge.outbox,
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
    onSuccess(txHash) {
      onClaimBroadcast(txHash)
    },
    onSettled() {
      queryClient.invalidateQueries({
        queryKey: ['claimStatus', { txid: claim?.withdrawTxHash }],
        refetchType: 'all',
      })
    },
  })

  return {
    executeTransactionDataResult,
    evmFeesResult,
    claimMutation,
  }
}
