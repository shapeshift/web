import type { ChildToParentMessageReader, ChildToParentTransactionEvent } from '@arbitrum/sdk'
import {
  ChildToParentMessageStatus,
  ChildTransactionReceipt,
  getArbitrumNetwork,
} from '@arbitrum/sdk'
import { Outbox__factory } from '@arbitrum/sdk/dist/lib/abi/factories/Outbox__factory'
import { BoldRollupUserLogic__factory } from '@arbitrum/sdk/dist/lib/abi-bold/factories/BoldRollupUserLogic__factory'
import { ARB1_NITRO_GENESIS_L2_BLOCK } from '@arbitrum/sdk/dist/lib/dataEntities/constants'
import type { AccountId, AssetId, ChainId } from '@shapeshiftoss/caip'
import {
  arbitrumChainId,
  ethChainId,
  fromAccountId,
  fromChainId,
  toAccountId,
} from '@shapeshiftoss/caip'
import { getEthersV5Provider } from '@shapeshiftoss/contracts'
import { KnownChainIds } from '@shapeshiftoss/types'
import type { Query } from '@tanstack/react-query'
import { useQueries } from '@tanstack/react-query'
import keyBy from 'lodash/keyBy'
import { useMemo } from 'react'

import { queryClient } from '@/context/QueryClientProvider/queryClient'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { assertUnreachable, isSome } from '@/lib/utils'
import type { ArbitrumBridgeWithdrawAction } from '@/state/slices/actionSlice/types'
import { ActionStatus } from '@/state/slices/actionSlice/types'
import {
  selectArbitrumWithdrawTxs,
  selectPendingArbitrumBridgeWithdrawActions,
  selectPortfolioLoadingStatus,
} from '@/state/slices/selectors'
import type { Tx } from '@/state/slices/txHistorySlice/txHistorySlice'
import { useAppSelector } from '@/state/store'

// Estimate from the withdraw until its covering assertion posts, about an hour in
const ARBITRUM_CHALLENGE_PERIOD_MS = 6.4 * 24 * 60 * 60 * 1000

export const getArbitrumClaimableAt = (withdrawTimeMs: number): number =>
  withdrawTimeMs + ARBITRUM_CHALLENGE_PERIOD_MS

// Assertions post roughly every 300 parent blocks, so the covering one lands well inside this window
const ASSERTION_SCAN_BLOCKS = 1_200
const LOG_RANGE_BLOCKS = 100
const ASSERTION_RETRY_MS = 10 * 60 * 1000

const UNCONFIRMED_POLL_MS = 60_000

type ConfirmedChildBlock = {
  assertionHash: string
  number: number
}

// Final once the covering assertion is found or the whole window has been scanned without it
type AssertionSearch = {
  claimableAt: number | undefined
  isFinal: boolean
}

type EthersV5Provider = ReturnType<typeof getEthersV5Provider>

export const arbitrumNetwork = getArbitrumNetwork(
  Number(fromChainId(arbitrumChainId).chainReference),
)

const CONFIRMED_CHILD_BLOCK_QUERY_KEY = ['arbitrumConfirmedChildBlock']

// Withdraws at or below this block are claimable; the sdk's own status scan exceeds our rpc's log range
const getConfirmedChildBlock = async (
  l1Provider: EthersV5Provider,
  l2Provider: EthersV5Provider,
  previous: ConfirmedChildBlock | undefined,
): Promise<ConfirmedChildBlock> => {
  const rollup = BoldRollupUserLogic__factory.connect(arbitrumNetwork.ethBridge.rollup, l1Provider)
  const latestConfirmed = await rollup.latestConfirmed()

  // Confirmations land about hourly, so most polls stop here
  if (previous?.assertionHash === latestConfirmed) return previous

  const createdAtBlock = (await rollup.getAssertion(latestConfirmed)).createdAtBlock.toNumber()

  const [assertionCreated] = await rollup.queryFilter(
    rollup.filters.AssertionCreated(latestConfirmed),
    createdAtBlock,
    createdAtBlock,
  )
  if (!assertionCreated) throw new Error(`AssertionCreated not found for ${latestConfirmed}`)

  const [blockHash] = assertionCreated.args.assertion.afterState.globalState.bytes32Vals
  const block = await l2Provider.getBlock(blockHash)
  if (!block) throw new Error(`Confirmed child block ${blockHash} not found`)

  return { assertionHash: latestConfirmed, number: block.number }
}

// Claimable one confirm period, at the parent chain's recent block rate, after the covering assertion posts
const findClaimableAt = async (
  parentBlockNumber: number,
  childBlockNumber: number,
  l1Provider: EthersV5Provider,
  l2Provider: EthersV5Provider,
): Promise<AssertionSearch> => {
  const rollup = BoldRollupUserLogic__factory.connect(arbitrumNetwork.ethBridge.rollup, l1Provider)
  const windowEndBlock = parentBlockNumber + ASSERTION_SCAN_BLOCKS
  const latest = await l1Provider.getBlock('latest')
  const toBlock = Math.min(windowEndBlock, latest.number)

  for (let fromBlock = parentBlockNumber; fromBlock <= toBlock; fromBlock += LOG_RANGE_BLOCKS) {
    const logs = await rollup.queryFilter(
      rollup.filters.AssertionCreated(),
      fromBlock,
      Math.min(fromBlock + LOG_RANGE_BLOCKS - 1, toBlock),
    )

    for (const log of logs) {
      const [blockHash] = log.args.assertion.afterState.globalState.bytes32Vals
      const childBlock = await l2Provider.getBlock(blockHash)
      if (!childBlock || childBlock.number < childBlockNumber) continue

      const { confirmPeriodBlocks } = arbitrumNetwork
      const [assertionBlock, periodStartBlock] = await Promise.all([
        l1Provider.getBlock(log.blockNumber),
        l1Provider.getBlock(latest.number - confirmPeriodBlocks),
      ])
      const confirmPeriodMs = (latest.timestamp - periodStartBlock.timestamp) * 1000

      return { claimableAt: assertionBlock.timestamp * 1000 + confirmPeriodMs, isFinal: true }
    }
  }

  // Past the window the estimate stands in rather than rescanning
  return { claimableAt: undefined, isFinal: latest.number >= windowEndBlock }
}

type ClaimMessage = {
  blockNumber: number
  withdrawTimeMs: number
  event: Extract<ChildToParentTransactionEvent, { position: unknown }>
  message: ChildToParentMessageReader
}

const getClaimMessage = async (
  txid: string,
  l1Provider: EthersV5Provider,
  l2Provider: EthersV5Provider,
): Promise<ClaimMessage> => {
  const receipt = await l2Provider.getTransactionReceipt(txid)
  const l2Receipt = new ChildTransactionReceipt(receipt)
  const [event] = l2Receipt.getChildToParentEvents()
  const [message] = await l2Receipt.getChildToParentMessages(l1Provider)
  if (!event || !message) throw new Error(`No withdraw message found for ${txid}`)
  if (!('position' in event)) throw new Error(`Unsupported classic withdraw ${txid}`)

  const { timestamp } = await l2Provider.getBlock(receipt.blockNumber)

  return { blockNumber: receipt.blockNumber, withdrawTimeMs: timestamp * 1000, event, message }
}

// Fetched once and shared with the swap flow, a withdraw's message never changes
export const fetchArbitrumClaimMessage = (txid: string): Promise<ClaimMessage> =>
  queryClient.fetchQuery({
    queryKey: ['arbitrumClaimMessage', { txid }],
    queryFn: () =>
      getClaimMessage(
        txid,
        getEthersV5Provider(KnownChainIds.EthereumMainnet),
        getEthersV5Provider(KnownChainIds.ArbitrumMainnet),
      ),
    staleTime: Infinity,
    gcTime: Infinity,
  })

type ClaimStatusResult = {
  event: ClaimMessage['event']
  message: ChildToParentMessageReader
  withdrawTimeMs: number
  status: ChildToParentMessageStatus
  claimableAt: number | undefined
}

// What a claim needs to know about its withdraw, from tx history or from the stored withdraw action
type WithdrawSource = {
  withdrawTxHash: string
  accountId: AccountId
  amountCryptoBaseUnit: string
  assetId: string
  destinationAddress: string
  destinationAssetId: AssetId
  destinationChainId: ChainId
}

// A withdraw's status in action terms: waiting on its challenge period, claimable, or claimed
export type ClaimDetails = WithdrawSource &
  Pick<ClaimStatusResult, 'event' | 'message' | 'withdrawTimeMs'> & {
    status: ActionStatus.Initiated | ActionStatus.ClaimAvailable | ActionStatus.Claimed
    claimableAt: number
  }

const toClaimStatus = (status: ChildToParentMessageStatus): ClaimDetails['status'] => {
  switch (status) {
    case ChildToParentMessageStatus.UNCONFIRMED:
      return ActionStatus.Initiated
    case ChildToParentMessageStatus.CONFIRMED:
      return ActionStatus.ClaimAvailable
    case ChildToParentMessageStatus.EXECUTED:
      return ActionStatus.Claimed
    default:
      return assertUnreachable(status)
  }
}

const getHistoryWithdrawSource = (tx: Tx): WithdrawSource | undefined => {
  if (tx.data?.parser !== 'arbitrumBridge') return
  if (!tx.transfers.length) return
  if (!tx.data.value || !tx.data.destinationAddress || !tx.data.destinationAssetId) return

  return {
    withdrawTxHash: tx.txid,
    accountId: toAccountId({ chainId: arbitrumChainId, account: tx.pubkey }),
    amountCryptoBaseUnit: tx.data.value,
    assetId: tx.transfers[0].assetId,
    destinationAddress: tx.data.destinationAddress,
    destinationAssetId: tx.data.destinationAssetId,
    destinationChainId: ethChainId,
  }
}

const getActionWithdrawSource = ({
  arbitrumBridgeMetadata: metadata,
}: ArbitrumBridgeWithdrawAction): WithdrawSource => ({
  withdrawTxHash: metadata.withdrawTxHash,
  accountId: metadata.accountId,
  amountCryptoBaseUnit: metadata.amountCryptoBaseUnit,
  assetId: metadata.assetId,
  destinationAddress: fromAccountId(metadata.destinationAccountId).account,
  destinationAssetId: metadata.destinationAssetId,
  destinationChainId: ethChainId,
})

// Stable and module level so claims only change when a withdraw's query result does
const combineClaims = (results: { data?: ClaimDetails }[]) => {
  const claims = results.map(({ data }) => data).filter(isSome)
  return { claims, claimsByTxid: keyBy(claims, claim => claim.withdrawTxHash) }
}

// Pollers keep the claims fresh, observers like the claim modal read the shared cache without extra timers
export const useArbitrumClaims = (props?: { skip?: boolean; isPolling?: boolean }) => {
  const arbitrumWithdrawTxs = useAppSelector(selectArbitrumWithdrawTxs)
  const pendingWithdrawActions = useAppSelector(selectPendingArbitrumBridgeWithdrawActions)
  const portfolioLoadingStatus = useAppSelector(selectPortfolioLoadingStatus)

  // Stored withdraws are tracked even when tx history isn't loaded, history adds the ones we missed
  const withdrawSources = useMemo(() => {
    const sources = new Map<string, WithdrawSource>()

    // Pre-nitro withdraws use the classic outbox, which we can neither track nor claim
    arbitrumWithdrawTxs
      .filter(tx => tx.blockHeight >= ARB1_NITRO_GENESIS_L2_BLOCK)
      .forEach(tx => {
        const source = getHistoryWithdrawSource(tx)
        if (source) sources.set(source.withdrawTxHash, source)
      })

    pendingWithdrawActions.forEach(action => {
      const source = getActionWithdrawSource(action)
      if (!sources.has(source.withdrawTxHash)) sources.set(source.withdrawTxHash, source)
    })

    return [...sources.values()]
  }, [arbitrumWithdrawTxs, pendingWithdrawActions])

  const {
    state: { isLoadingLocalWallet, modal, isConnected },
  } = useWallet()

  const skip = useMemo(() => {
    // consumer says we should skip so we skip
    if (props?.skip) return true

    return !isConnected || portfolioLoadingStatus === 'loading' || modal || isLoadingLocalWallet
  }, [isConnected, portfolioLoadingStatus, modal, isLoadingLocalWallet, props?.skip])

  const l1Provider = getEthersV5Provider(KnownChainIds.EthereumMainnet)
  const l2Provider = getEthersV5Provider(KnownChainIds.ArbitrumMainnet)

  // Shared by every withdraw in the same poll, falling back to the last good block on a failed refresh
  const fetchConfirmedChildBlock = async (): Promise<ConfirmedChildBlock> => {
    const previous = queryClient.getQueryData<ConfirmedChildBlock>(CONFIRMED_CHILD_BLOCK_QUERY_KEY)

    try {
      return await queryClient.fetchQuery({
        queryKey: CONFIRMED_CHILD_BLOCK_QUERY_KEY,
        queryFn: () => getConfirmedChildBlock(l1Provider, l2Provider, previous),
        staleTime: 30_000,
        gcTime: Infinity,
      })
    } catch (error) {
      if (previous) return previous
      throw error
    }
  }

  const { claims, claimsByTxid } = useQueries({
    queries: withdrawSources.map(source => {
      const txid = source.withdrawTxHash

      return {
        queryKey: ['claimStatus', { txid }],
        queryFn: async (): Promise<ClaimStatusResult> => {
          const { blockNumber, withdrawTimeMs, event, message } =
            await fetchArbitrumClaimMessage(txid)

          const confirmedChildBlock = await fetchConfirmedChildBlock()

          if (blockNumber > confirmedChildBlock.number) {
            // Kept once final, retried until the covering assertion posts
            const { claimableAt } = await queryClient.fetchQuery({
              queryKey: ['arbitrumClaimAssertion', { txid }],
              queryFn: () =>
                findClaimableAt(event.ethBlockNum.toNumber(), blockNumber, l1Provider, l2Provider),
              staleTime: query => (query.state.data?.isFinal ? Infinity : ASSERTION_RETRY_MS),
              gcTime: Infinity,
            })

            return {
              event,
              message,
              withdrawTimeMs,
              status: ChildToParentMessageStatus.UNCONFIRMED,
              claimableAt,
            }
          }

          const outbox = Outbox__factory.connect(arbitrumNetwork.ethBridge.outbox, l1Provider)
          const isSpent = await outbox.isSpent(event.position)

          return {
            event,
            message,
            withdrawTimeMs,
            status: isSpent
              ? ChildToParentMessageStatus.EXECUTED
              : ChildToParentMessageStatus.CONFIRMED,
            claimableAt: undefined,
          }
        },
        select: (result: ClaimStatusResult): ClaimDetails => ({
          ...source,
          status: toClaimStatus(result.status),
          withdrawTimeMs: result.withdrawTimeMs,
          claimableAt: result.claimableAt ?? getArbitrumClaimableAt(result.withdrawTimeMs),
          event: result.event,
          message: result.message,
        }),
        // Only a pending withdraw changes on its own, claims made elsewhere are caught on load or in the modal
        refetchInterval: (latestData: Query<ClaimStatusResult>) => {
          if (props?.isPolling === false) return false

          const data = latestData?.state?.data
          if (!data) return UNCONFIRMED_POLL_MS
          if (data.status !== ChildToParentMessageStatus.UNCONFIRMED) return false

          // Until its assertion posts only the countdown can improve, after that nothing changes before it opens
          if (data.claimableAt === undefined) return ASSERTION_RETRY_MS
          return Math.max(data.claimableAt - Date.now(), UNCONFIRMED_POLL_MS)
        },
        enabled: !skip,
        staleTime: Infinity,
        gcTime: Infinity,
      }
    }),
    combine: combineClaims,
  })

  return {
    claims,
    claimsByTxid,
  }
}
