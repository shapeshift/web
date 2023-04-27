import type { Asset } from '@shapeshiftoss/asset-service'
import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import { adapters, CHAIN_NAMESPACE, fromAssetId, thorchainAssetId } from '@shapeshiftoss/caip'
import type {
  ChainAdapterManager,
  CosmosSdkBaseAdapter,
  EvmBaseAdapter,
  SignTx,
  UtxoBaseAdapter,
} from '@shapeshiftoss/chain-adapters'
import { KnownChainIds } from '@shapeshiftoss/types'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import type Web3 from 'web3'
import type {
  ApprovalNeededInput,
  ApprovalNeededOutput,
  ApproveInfiniteInput,
  BuildTradeInput,
  BuyAssetBySellIdInput,
  ExecuteTradeInput,
  GetTradeQuoteInput,
  SwapErrorRight,
  Swapper,
  TradeQuote,
  TradeResult,
  TradeTxs,
} from 'lib/swapper/api'
import { buildTrade } from 'lib/swapper/swappers/ThorchainSwapper/buildThorTrade/buildThorTrade'
import { getThorTradeQuote } from 'lib/swapper/swappers/ThorchainSwapper/getThorTradeQuote/getTradeQuote'
import { thorTradeApprovalNeeded } from 'lib/swapper/swappers/ThorchainSwapper/thorTradeApprovalNeeded/thorTradeApprovalNeeded'
import { thorTradeApproveInfinite } from 'lib/swapper/swappers/ThorchainSwapper/thorTradeApproveInfinite/thorTradeApproveInfinite'
import type {
  MidgardActionsResponse,
  ThorchainSwapperDeps,
  ThornodePoolResponse,
  ThorTrade,
} from 'lib/swapper/swappers/ThorchainSwapper/types'
import { getUsdRate } from 'lib/swapper/swappers/ThorchainSwapper/utils/getUsdRate/getUsdRate'
import { thorService } from 'lib/swapper/swappers/ThorchainSwapper/utils/thorService'

import { makeSwapErrorRight, SwapError, SwapErrorType, SwapperName, SwapperType } from '../../api'

export * from 'lib/swapper/swappers/ThorchainSwapper/types'

export type ThorUtxoSupportedChainId =
  | KnownChainIds.BitcoinMainnet
  | KnownChainIds.DogecoinMainnet
  | KnownChainIds.LitecoinMainnet
  | KnownChainIds.BitcoinCashMainnet

export type ThorEvmSupportedChainId = KnownChainIds.EthereumMainnet | KnownChainIds.AvalancheMainnet

export type ThorCosmosSdkSupportedChainId =
  | KnownChainIds.ThorchainMainnet
  | KnownChainIds.CosmosMainnet

export type ThorChainId =
  | ThorCosmosSdkSupportedChainId
  | ThorEvmSupportedChainId
  | ThorUtxoSupportedChainId

export class ThorchainSwapper implements Swapper<ChainId> {
  readonly name = SwapperName.Thorchain

  private sellSupportedChainIds: Record<ThorChainId, boolean> = {
    [KnownChainIds.EthereumMainnet]: true,
    [KnownChainIds.BitcoinMainnet]: true,
    [KnownChainIds.DogecoinMainnet]: true,
    [KnownChainIds.LitecoinMainnet]: true,
    [KnownChainIds.BitcoinCashMainnet]: true,
    [KnownChainIds.CosmosMainnet]: true,
    [KnownChainIds.ThorchainMainnet]: true,
    [KnownChainIds.AvalancheMainnet]: true,
  }

  private buySupportedChainIds: Record<ThorChainId, boolean> = {
    [KnownChainIds.EthereumMainnet]: true,
    [KnownChainIds.BitcoinMainnet]: true,
    [KnownChainIds.DogecoinMainnet]: true,
    [KnownChainIds.LitecoinMainnet]: true,
    [KnownChainIds.BitcoinCashMainnet]: true,
    [KnownChainIds.CosmosMainnet]: true,
    [KnownChainIds.ThorchainMainnet]: true,
    [KnownChainIds.AvalancheMainnet]: true,
  }

  private supportedSellAssetIds: AssetId[] = [thorchainAssetId]
  private supportedBuyAssetIds: AssetId[] = [thorchainAssetId]

  deps: ThorchainSwapperDeps
  daemonUrl: string
  midgardUrl: string
  adapterManager: ChainAdapterManager
  web3: Web3

  constructor(deps: ThorchainSwapperDeps) {
    this.deps = deps
    this.daemonUrl = deps.daemonUrl
    this.midgardUrl = deps.midgardUrl
    this.adapterManager = deps.adapterManager
    this.web3 = deps.web3
  }

  async initialize() {
    try {
      return (
        await thorService.get<ThornodePoolResponse[]>(`${this.deps.daemonUrl}/lcd/thorchain/pools`)
      ).map(({ data: allPools }) => {
        const availablePools = allPools.filter(pool => pool.status === 'Available')

        availablePools.forEach(pool => {
          const assetId = adapters.poolAssetIdToAssetId(pool.asset)
          if (!assetId) return

          const chainId = fromAssetId(assetId).chainId as ThorChainId

          this.sellSupportedChainIds[chainId] && this.supportedSellAssetIds.push(assetId)
          this.buySupportedChainIds[chainId] && this.supportedBuyAssetIds.push(assetId)
        })

        return undefined
      })
    } catch (e: unknown) {
      return Err(
        makeSwapErrorRight({
          message: '[thorchainInitialize]: initialize failed to set supportedAssetIds',
          code: SwapErrorType.INITIALIZE_FAILED,
          cause: (e as Error)?.message,
        }),
      )
    }
  }

  getType() {
    return SwapperType.Thorchain
  }

  getUsdRate({ assetId }: Pick<Asset, 'assetId'>): Promise<Result<string, SwapErrorRight>> {
    return getUsdRate(this.daemonUrl, assetId)
  }

  approvalNeeded(
    input: ApprovalNeededInput<ThorEvmSupportedChainId>,
  ): Promise<Result<ApprovalNeededOutput, SwapErrorRight>> {
    return thorTradeApprovalNeeded({ deps: this.deps, input })
  }

  approveInfinite(input: ApproveInfiniteInput<ThorEvmSupportedChainId>): Promise<string> {
    return thorTradeApproveInfinite({ deps: this.deps, input })
  }

  approveAmount(): Promise<string> {
    throw new SwapError('ThorchainSwapper: approveAmount unimplemented', {
      code: SwapErrorType.RESPONSE_ERROR,
    })
  }

  filterBuyAssetsBySellAssetId(args: BuyAssetBySellIdInput): AssetId[] {
    const { assetIds = [], sellAssetId } = args
    if (!this.supportedSellAssetIds.includes(sellAssetId)) return []
    return assetIds.filter(
      assetId => this.supportedBuyAssetIds.includes(assetId) && assetId !== sellAssetId,
    )
  }

  filterAssetIdsBySellable(): AssetId[] {
    return this.supportedSellAssetIds
  }

  buildTrade(input: BuildTradeInput): Promise<Result<ThorTrade<ChainId>, SwapErrorRight>> {
    return buildTrade({ deps: this.deps, input })
  }

  getTradeQuote(input: GetTradeQuoteInput): Promise<Result<TradeQuote<ChainId>, SwapErrorRight>> {
    return getThorTradeQuote({ deps: this.deps, input })
  }

  async executeTrade(
    args: ExecuteTradeInput<ChainId>,
  ): Promise<Result<TradeResult, SwapErrorRight>> {
    try {
      const { trade, wallet } = args

      const { chainNamespace, chainId } = fromAssetId(trade.sellAsset.assetId)
      const adapter = this.deps.adapterManager.get(chainId)

      if (!adapter) {
        throw new SwapError('[executeTrade]: no adapter for sell asset chain id', {
          code: SwapErrorType.SIGN_AND_BROADCAST_FAILED,
          details: { chainId },
          fn: 'executeTrade',
        })
      }

      if (chainNamespace === CHAIN_NAMESPACE.Evm) {
        const evmAdapter = adapter as unknown as EvmBaseAdapter<ThorEvmSupportedChainId>
        const txToSign = (trade as ThorTrade<ThorEvmSupportedChainId>)
          .txData as SignTx<ThorEvmSupportedChainId>
        if (wallet.supportsBroadcast()) {
          const tradeId = await evmAdapter.signAndBroadcastTransaction({ txToSign, wallet })
          return Ok({ tradeId })
        }
        const signedTx = await evmAdapter.signTransaction({ txToSign, wallet })
        const tradeId = await adapter.broadcastTransaction(signedTx)
        return Ok({ tradeId })
      } else if (chainNamespace === CHAIN_NAMESPACE.Utxo) {
        const signedTx = await (
          adapter as unknown as UtxoBaseAdapter<ThorUtxoSupportedChainId>
        ).signTransaction({
          txToSign: (trade as ThorTrade<ThorUtxoSupportedChainId>)
            .txData as SignTx<ThorUtxoSupportedChainId>,
          wallet,
        })
        const txid = await adapter.broadcastTransaction(signedTx)
        return Ok({ tradeId: txid })
      } else if (chainNamespace === CHAIN_NAMESPACE.CosmosSdk) {
        const signedTx = await (
          adapter as unknown as CosmosSdkBaseAdapter<ThorCosmosSdkSupportedChainId>
        ).signTransaction({
          txToSign: (trade as ThorTrade<ThorCosmosSdkSupportedChainId>)
            .txData as SignTx<ThorCosmosSdkSupportedChainId>,
          wallet,
        })
        const txid = await adapter.broadcastTransaction(signedTx)
        return Ok({ tradeId: txid })
      } else {
        return Err(
          makeSwapErrorRight({
            message: '[executeTrade]: unsupported trade',
            code: SwapErrorType.SIGN_AND_BROADCAST_FAILED,
          }),
        )
      }
    } catch (e) {
      if (e instanceof SwapError) throw e
      throw new SwapError('[executeTrade]: failed to sign or broadcast', {
        code: SwapErrorType.SIGN_AND_BROADCAST_FAILED,
        cause: e,
      })
    }
  }

  async getTradeTxs(tradeResult: TradeResult): Promise<Result<TradeTxs, SwapErrorRight>> {
    const midgardTxid = tradeResult.tradeId.startsWith('0x')
      ? tradeResult.tradeId.slice(2)
      : tradeResult.tradeId

    return (
      await thorService.get<MidgardActionsResponse>(
        `${this.deps.midgardUrl}/actions?txid=${midgardTxid}`,
      )
    ).andThen<TradeTxs>(({ data }) => {
      // https://gitlab.com/thorchain/thornode/-/blob/develop/common/tx.go#L22
      // responseData?.actions[0].out[0].txID should be the txId for consistency, but the outbound Tx for Thor rune swaps is actually a BlankTxId
      // so we use the buyTxId for completion detection
      const buyTxid =
        data?.actions[0]?.status === 'success' && data?.actions[0]?.type === 'swap'
          ? midgardTxid
          : ''

      // This will detect all the errors I have seen.
      if (data?.actions[0]?.status === 'success' && data?.actions[0]?.type !== 'swap')
        return Err(
          makeSwapErrorRight({
            message: '[getTradeTxs]: trade failed',
            code: SwapErrorType.TRADE_FAILED,
            cause: data,
          }),
        )

      const standardBuyTxid = (() => {
        const outCoinAsset = data?.actions[0]?.out[0]?.coins[0]?.asset
        const isEvmCoinAsset = outCoinAsset?.startsWith('ETH.') || outCoinAsset?.startsWith('AVAX.')
        return isEvmCoinAsset ? `0x${buyTxid}` : buyTxid
      })().toLowerCase()

      return Ok({
        sellTxid: tradeResult.tradeId,
        buyTxid: standardBuyTxid,
      })
    })
  }
}
