import type { ChildToParentMessageReader, ChildToParentTransactionEvent } from '@arbitrum/sdk'
import { ChildToParentMessageStatus, ChildTransactionReceipt } from '@arbitrum/sdk'
import type { AccountId, AssetId, ChainId } from '@shapeshiftoss/caip'
import {
  arbitrumChainId,
  ethAssetId,
  ethChainId,
  fromAccountId,
  toAccountId,
} from '@shapeshiftoss/caip'
import type { Transaction } from '@shapeshiftoss/chain-adapters'
import { getEthersV5Provider } from '@shapeshiftoss/contracts'
import { KnownChainIds } from '@shapeshiftoss/types'
import type { evm } from '@shapeshiftoss/unchained-client'
import type { UseQueryResult } from '@tanstack/react-query'
import { useQueries } from '@tanstack/react-query'
import axios from 'axios'
import { getConfig } from 'config'
import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { mergeQueryOutputs } from 'react-queries/helpers'
import { ClaimStatus } from 'components/ClaimRow/types'
import { assertUnreachable } from 'lib/utils'
import { assertGetEvmChainAdapter } from 'lib/utils/evm'
import { selectAssetById, selectEnabledWalletAccountIds } from 'state/slices/selectors'
import type { Tx } from 'state/slices/txHistorySlice/txHistorySlice'
import { useAppSelector } from 'state/store'

const AVERAGE_BLOCK_TIME_BLOCKS = 1000

type ClaimStatusResult = {
  event: ChildToParentTransactionEvent
  message: ChildToParentMessageReader
  status: ChildToParentMessageStatus
  timeRemainingSeconds: number | undefined
}

export type ClaimDetails = Omit<ClaimStatusResult, 'status'> & {
  accountId: AccountId
  amountCryptoBaseUnit: string
  assetId: string
  description: string
  destinationAddress: string
  destinationAssetId: AssetId
  destinationChainId: ChainId
  destinationExplorerTxLink: string
  tx: Tx
}

type ClaimsByStatus = Record<ClaimStatus, ClaimDetails[]>

const getArbitrumTx = async (txHash: string) => {
  const apiUrl = getConfig().REACT_APP_UNCHAINED_ETHEREUM_HTTP_URL
  // using a timeout because if unchained hasn't seen a tx it will hang until eventual 520
  const { data: txData } = await axios.get<evm.types.Tx>(`${apiUrl}/api/v1/tx/${txHash}`, {
    timeout: 2000,
  })

  return txData
}

export const useArbitrumClaimsByStatus = () => {
  const translate = useTranslate()

  const enabledWalletAccountIds = useAppSelector(selectEnabledWalletAccountIds)
  const ethAsset = useAppSelector(state => selectAssetById(state, ethAssetId))

  const l1Provider = getEthersV5Provider(KnownChainIds.EthereumMainnet)
  const l2Provider = getEthersV5Provider(KnownChainIds.ArbitrumMainnet)

  const addresses = useMemo(() => {
    const arbitrumAccountIds = enabledWalletAccountIds.filter(
      accountId => fromAccountId(accountId).chainId === KnownChainIds.ArbitrumMainnet,
    )

    return arbitrumAccountIds.map(accountId => fromAccountId(accountId).account)
  }, [enabledWalletAccountIds])

  const arbitrumBridgeTxQueries = useMemo(() => {
    return {
      queries: (addresses ?? []).map(address => {
        return {
          queryKey: ['arbitrumBridgeTxs', { address }],
          queryFn: async () => {
            // `cast sig-event "event L2ToL1Tx(address,address indexed,uint256 indexed,uint256 indexed,uint256,uint256,uint256,uint256,bytes)"`
            const eventSig = '0x3e7aafa77dbf186b7fd488006beff893744caa3c4f6f299e8a709fa2087374fc'

            const arbitrumChainAdapter = assertGetEvmChainAdapter(KnownChainIds.ArbitrumMainnet)

            const filter = {
              address,
              topics: [eventSig],
            }
            const logs = await l2Provider.getLogs(filter)

            return Promise.all(
              logs.map(async log => {
                const [receipt, tx] = await Promise.all([
                  l2Provider.getTransactionReceipt(log.transactionHash),
                  getArbitrumTx(log.transactionHash).then(tx =>
                    arbitrumChainAdapter.parseTx(tx, address),
                  ),
                ])
                return { receipt, tx }
              }),
            )
          },
          refetchInterval: 60_000,
        }
      }),
      combine: (
        queries: UseQueryResult<
          {
            tx: Transaction
            receipt: Awaited<ReturnType<typeof l2Provider.getTransactionReceipt>>
          }[],
          unknown
        >[],
      ) => mergeQueryOutputs(queries, results => results.flat()),
    }
  }, [addresses, l2Provider])

  const { data: txs, isLoading: isLoadingTxs } = useQueries(arbitrumBridgeTxQueries)

  const queries = useMemo(() => {
    return {
      queries: (txs ?? []).map(({ tx, receipt }) => {
        return {
          queryKey: ['claimStatus', { txid: tx.txid }],
          queryFn: async () => {
            const l2Receipt = new ChildTransactionReceipt(receipt)
            const events = l2Receipt.getChildToParentEvents()
            const messages = await l2Receipt.getChildToParentMessages(l1Provider)

            const event = events[0]
            const message = messages[0]

            const status = await message.status(l2Provider)
            const block = (await message.getFirstExecutableBlock(l2Provider))?.toNumber()

            const timeRemainingSeconds = await (async () => {
              if (!block) return

              const latestBlock = await l1Provider.getBlock('latest')
              const historicalBlock = await l1Provider.getBlock(
                latestBlock.number - AVERAGE_BLOCK_TIME_BLOCKS,
              )

              const averageBlockTimeSeconds =
                (latestBlock.timestamp - historicalBlock.timestamp) / AVERAGE_BLOCK_TIME_BLOCKS

              const remainingBlocks = block - latestBlock.number

              return remainingBlocks * averageBlockTimeSeconds
            })()

            return {
              event,
              message,
              status,
              timeRemainingSeconds,
            }
          },
          select: ({ event, message, status, timeRemainingSeconds }: ClaimStatusResult) => {
            const claimStatus = (() => {
              switch (status) {
                case ChildToParentMessageStatus.CONFIRMED:
                  return ClaimStatus.Available
                case ChildToParentMessageStatus.EXECUTED:
                  return ClaimStatus.Complete
                case ChildToParentMessageStatus.UNCONFIRMED:
                  return ClaimStatus.Pending
                default:
                  assertUnreachable(status)
              }
            })()

            return {
              tx,
              event,
              message,
              claimStatus,
              timeRemainingSeconds,
            }
          },
          refetchInterval: 60_000,
        }
      }),
    }
  }, [l1Provider, l2Provider, txs])

  const claimStatuses = useQueries(queries)

  const claimsByStatus = useMemo(() => {
    return claimStatuses.reduce<ClaimsByStatus>(
      (prev, { data }) => {
        if (!data) return prev
        if (!ethAsset) return prev
        if (!data.tx.transfers.length) return prev

        if (data.tx.data?.parser === 'arbitrumBridge') {
          if (!data.tx.data.value) return prev
          if (!data.tx.data.destinationAddress) return prev
          if (!data.tx.data.destinationAssetId) return prev

          prev[data.claimStatus].push({
            tx: data.tx,
            accountId: toAccountId({
              chainId: arbitrumChainId,
              account: data.tx.pubkey,
            }),
            amountCryptoBaseUnit: data.tx.data.value,
            destinationAddress: data.tx.data.destinationAddress,
            destinationAssetId: data.tx.data.destinationAssetId,
            destinationChainId: ethChainId,
            destinationExplorerTxLink: ethAsset.explorerTxLink,
            assetId: data.tx.transfers[0].assetId,
            event: data.event,
            message: data.message,
            timeRemainingSeconds: data.timeRemainingSeconds,
            description: translate('bridge.arbitrum.description'),
          })
        }

        return prev
      },
      {
        [ClaimStatus.Pending]: [],
        [ClaimStatus.Available]: [],
        [ClaimStatus.Complete]: [],
      },
    )
  }, [ethAsset, claimStatuses, translate])

  return {
    claimsByStatus,
    isLoading: isLoadingTxs || claimStatuses.some(claimStatus => claimStatus.isLoading),
  }
}
