import { L2ToL1MessageStatus, L2TransactionReceipt } from '@arbitrum/sdk'
import { ethChainId } from '@shapeshiftoss/caip'
import { CONTRACT_INTERACTION } from '@shapeshiftoss/chain-adapters'
import { KnownChainIds } from '@shapeshiftoss/types'
import { skipToken, useMutation, useQuery } from '@tanstack/react-query'
import { outboxAbi } from 'contracts/abis/Outbox'
import { encodeFunctionData, getAddress } from 'viem'
import { ClaimStatus } from 'components/ClaimRow/types'
import { useEvmFees } from 'hooks/queries/useEvmFees'
import { useWallet } from 'hooks/useWallet/useWallet'
import { getEthersV5Provider } from 'lib/ethersProviderSingleton'
import { assertUnreachable } from 'lib/utils'
import {
  assertGetEvmChainAdapter,
  buildAndBroadcast,
  createBuildCustomTxInput,
} from 'lib/utils/evm'

const AVERAGE_BLOCK_TIME_BLOCKS = 1000

export const useArbitrumClaimStatus = (txid: string) => {
  const wallet = useWallet().state.wallet

  const l1Provider = getEthersV5Provider(KnownChainIds.EthereumMainnet)
  const l2Provider = getEthersV5Provider(KnownChainIds.ArbitrumMainnet)

  const l1DataResult = useQuery({
    queryKey: ['l1Data', { txid }],
    queryFn: !txid
      ? skipToken
      : async () => {
          const receipt = await l2Provider.getTransactionReceipt(txid)
          const l2Receipt = new L2TransactionReceipt(receipt)
          const events = l2Receipt.getL2ToL1Events()
          const messages = await l2Receipt.getL2ToL1Messages(l1Provider)

          return {
            event: events[0],
            message: messages[0],
          }
        },
  })

  const claimStatusResult = useQuery({
    queryKey: ['claimStatus', { txid }],
    queryFn: !l1DataResult.data
      ? skipToken
      : async () => {
          const { message } = l1DataResult.data
          const status = await message.status(l2Provider)

          const claimStatus = (() => {
            switch (status) {
              case L2ToL1MessageStatus.CONFIRMED:
                return ClaimStatus.Available
              case L2ToL1MessageStatus.EXECUTED:
                return ClaimStatus.Complete
              case L2ToL1MessageStatus.UNCONFIRMED:
                return ClaimStatus.Pending
              default:
                assertUnreachable(status)
            }
          })()

          const block = await message.getFirstExecutableBlock(l2Provider)

          const timeRemaining = await (async () => {
            if (!block) return

            const latestBlock = await l1Provider.getBlock('latest')
            const historicalBlock = await l1Provider.getBlock(
              latestBlock.number - AVERAGE_BLOCK_TIME_BLOCKS,
            )

            const averageBlockTimeSeconds =
              latestBlock.timestamp - historicalBlock.timestamp / AVERAGE_BLOCK_TIME_BLOCKS

            const remainingBlocks = block.sub(latestBlock.number)

            return remainingBlocks.mul(averageBlockTimeSeconds)
          })()

          return {
            status: claimStatus,
            timeRemaining,
          }
        },
  })

  const executeTransactionDataResult = useQuery({
    queryKey: ['executeTransactionData', { txid }],
    queryFn: !l1DataResult.data
      ? skipToken
      : async () => {
          const { event, message } = l1DataResult.data

          const proof = await message.getOutboxProof(l2Provider)

          console.log({ proof })

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
    mutationKey: ['claim', { txid }],
    mutationFn: async () => {
      if (!wallet) return
      if (!l1DataResult.data) return
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
  })

  return {
    l1DataResult,
    claimStatusResult,
    evmFeesResult,
    claimMutation,
  }
}
