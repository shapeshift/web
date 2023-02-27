import type { ChainId as LifiChainId, ChainKey, ConfigUpdate, TokensResponse } from '@lifi/sdk'
import LIFI from '@lifi/sdk'
import type { Asset } from '@shapeshiftoss/asset-service'
import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import { fromChainId } from '@shapeshiftoss/caip'
import type { EvmChainId } from '@shapeshiftoss/chain-adapters'
import { evmChainIds } from '@shapeshiftoss/chain-adapters'
import type {
  ApprovalNeededOutput,
  BuildTradeInput,
  BuyAssetBySellIdInput,
  ExecuteTradeInput,
  GetEvmTradeQuoteInput,
  Swapper,
  SwapperType,
  Trade,
  TradeQuote,
  TradeResult,
  TradeTxs,
} from '@shapeshiftoss/swapper'
import { SwapError } from '@shapeshiftoss/swapper'
import { bn } from 'lib/bignumber/bignumber'
import { filterAssetIdsBySellable } from 'lib/swapper/LifiSwapper/filterAssetIdsBySellable/filterAssetIdsBySellable'
import { filterBuyAssetsBySellAssetId } from 'lib/swapper/LifiSwapper/filterBuyAssetsBySellAssetId/filterBuyAssetsBySellAssetId'
import { getTradeQuote } from 'lib/swapper/LifiSwapper/getTradeQuote/getTradeQuote'
import { getUsdRate } from 'lib/swapper/LifiSwapper/getUsdRate/getUsdRate'
import type { LifiToolMeta } from 'lib/swapper/LifiSwapper/types'
import { SWAPPER_NAME, SWAPPER_TYPE } from 'lib/swapper/LifiSwapper/utils/constants'

// TODO: move into utility
const getOrHyrdate = <Key, Value>(
  map: Map<Key, Value>,
  key: Key,
  getNewValue: () => Value,
): Value => {
  const item = map.get(key)

  if (item === undefined) {
    const newItem = getNewValue()
    map.set(key, newItem)
    return newItem
  }

  return item
}

export class LifiSwapper implements Swapper<EvmChainId> {
  readonly name = SWAPPER_NAME
  private readonly lifi: LIFI
  private chainMap: Map<number, ChainKey> = new Map()
  private tokens: TokensResponse['tokens'] = {}

  // describes metadata about a token and possible swaps
  // sellToken -> buyToken -> tool -> metadata
  // TODO: this needs to also be indexed by fromChainId and toChainId
  private lifiToolMap: Map<string, Map<string, Map<string, LifiToolMeta>>> = new Map()

  constructor() {
    const config: ConfigUpdate = {
      disableVersionCheck: true, // prevent console notifying client about updates
    }

    this.lifi = new LIFI(config)
  }

  /** perform any necessary async initialization */
  async initialize(): Promise<void> {
    const supportedChainRefs = evmChainIds.map(chainId =>
      // TODO: dont cast to number here, instead do a proper lookup
      Number(fromChainId(chainId).chainReference),
    ) as LifiChainId[]
    const chains = await this.lifi.getChains()
    this.chainMap = new Map(
      chains
        .filter(({ chainType, id }) => chainType === 'EVM' && supportedChainRefs.includes(id))
        .map(({ id, key }) => [id, key]),
    )

    // TODO: fetch tokens, chains and bridges in 1 request by adding 'tokens', chains' to the array for getPossibilities
    const [{ tokens }, { bridges }] = await Promise.all([
      this.lifi.getTokens({
        chains: [...this.chainMap.keys()] as LifiChainId[],
      }),
      this.lifi.getPossibilities({
        include: ['bridges'],
        chains: supportedChainRefs,
      }),
    ])

    this.tokens = tokens

    // TODO: move this into a util
    if (bridges !== undefined) {
      for (const bridge of bridges) {
        const { fromToken, toToken, maximumTransfer, minimumTransfer, tool } = bridge

        const toTokenIndex = getOrHyrdate<string, Map<string, Map<string, LifiToolMeta>>>(
          this.lifiToolMap,
          fromToken.symbol,
          () => new Map(),
        )

        const toolIndex = getOrHyrdate<string, Map<string, LifiToolMeta>>(
          toTokenIndex,
          toToken.symbol,
          () => new Map(),
        )

        toolIndex.set(tool, {
          maximumTransfer: bn(maximumTransfer),
          minimumTransfer: bn(minimumTransfer),
        })
      }
    }
  }

  /** Returns the swapper type */
  getType(): SwapperType {
    return SWAPPER_TYPE
  }

  /**
   * Builds a trade with definitive rate & txData that can be executed with executeTrade
   **/
  async buildTrade(_args: BuildTradeInput): Promise<Trade<EvmChainId>> {
    return await Promise.reject(new SwapError('LifiSwapper: buildTrade unimplemented'))
  }

  /**
   * Get a trade quote
   */
  async getTradeQuote(input: GetEvmTradeQuoteInput): Promise<TradeQuote<EvmChainId>> {
    return await getTradeQuote(input, this.tokens, this.chainMap, this.lifiToolMap, this.lifi)
  }

  /**
   * Get the usd rate from either the assets symbol or tokenId
   */
  async getUsdRate(asset: Asset): Promise<string> {
    return await getUsdRate(asset, this.chainMap, this.lifi)
  }

  /**
   * Execute a trade built with buildTrade by signing and broadcasting
   */
  async executeTrade(_args: ExecuteTradeInput<ChainId>): Promise<TradeResult> {
    return await Promise.reject(new SwapError('LifiSwapper: executeTrade unimplemented'))
  }

  /**
   * Get a boolean if a quote needs approval
   */
  async approvalNeeded(): Promise<ApprovalNeededOutput> {
    return await Promise.resolve({ approvalNeeded: false })
  }

  /**
   * Get the txid of an approve infinite transaction
   */
  async approveInfinite(): Promise<string> {
    return await Promise.reject(new SwapError('LifiSwapper: approveInfinite unimplemented'))
  }

  /**
   * Get the txid of an approve amount transaction
   * If no amount is specified the sell amount of the quote will be used
   */
  async approveAmount(): Promise<string> {
    return await Promise.reject(new SwapError('LifiSwapper: approveAmount unimplemented'))
  }

  /**
   * Get supported buyAssetId's by sellAssetId
   */
  filterBuyAssetsBySellAssetId(input: BuyAssetBySellIdInput): AssetId[] {
    return filterBuyAssetsBySellAssetId(input, this.tokens)
  }

  /**
   * Get supported sell assetIds
   */
  filterAssetIdsBySellable(assetIds: AssetId[]): AssetId[] {
    return filterAssetIdsBySellable(assetIds, this.tokens)
  }

  /**
   * Get transactions related to a trade
   */
  async getTradeTxs(_tradeResult: TradeResult): Promise<TradeTxs> {
    return await Promise.reject(new SwapError('LifiSwapper: getTradeTxs unimplemented'))
  }
}
