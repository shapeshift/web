import type { ChainId as LifiChainId, ChainKey, ConfigUpdate, Token } from '@lifi/sdk'
import LIFI from '@lifi/sdk'
import type { Asset } from '@shapeshiftoss/asset-service'
import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import { fromAssetId, fromChainId } from '@shapeshiftoss/caip'
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
import { getUsdRate } from 'lib/swapper/LifiSwapper/getUsdRate/getUsdRate'
import { SWAPPER_NAME, SWAPPER_TYPE } from 'lib/swapper/LifiSwapper/utils/constants'
import { selectAssets } from 'state/slices/selectors'
import { store } from 'state/store'

export class LifiSwapper implements Swapper<EvmChainId> {
  readonly name = SWAPPER_NAME
  private readonly lifi: LIFI
  private chainMap: Map<number, ChainKey> = new Map()
  private tokenMap: Map<string, Pick<Token, 'decimals' | 'symbol'>> = new Map()

  constructor() {
    const config: ConfigUpdate = {
      disableVersionCheck: true, // prevent console notifying client about updates
    }

    this.lifi = new LIFI(config)
  }

  /** perform any necessary async initialization */
  async initialize(): Promise<void> {
    const supportedChainRefs = evmChainIds.map(
      chainId => +fromChainId(chainId).chainReference,
    ) as LifiChainId[]
    const chains = await this.lifi.getChains()
    this.chainMap = new Map(
      chains
        .filter(({ chainType, id }) => chainType === 'EVM' && supportedChainRefs.includes(id))
        .map(({ id, key }) => [id, key]),
    )

    const { tokens } = await this.lifi.getTokens({
      chains: [...this.chainMap.keys()] as LifiChainId[],
    })

    this.tokenMap = new Map(
      ([] as [string, Pick<Token, 'decimals' | 'symbol'>][]).concat(
        ...[...this.chainMap.keys()].map(chainId =>
          tokens[chainId].map(
            ({ decimals, symbol }) =>
              [symbol.toUpperCase(), { decimals, symbol }] as [
                string,
                Pick<Token, 'decimals' | 'symbol'>,
              ],
          ),
        ),
      ),
    )
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
  async getTradeQuote(_input: GetEvmTradeQuoteInput): Promise<TradeQuote<EvmChainId>> {
    return await Promise.reject(new SwapError('LifiSwapper: getTradeQuote unimplemented'))
  }

  /**
   * Get the usd rate from either the assets symbol or tokenId
   */
  async getUsdRate(asset: Asset): Promise<string> {
    return await getUsdRate(asset, this.chainMap, this.tokenMap, this.lifi)
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
  filterBuyAssetsBySellAssetId(args: BuyAssetBySellIdInput): AssetId[] {
    const { assetIds = [], sellAssetId } = args

    const assetIdMap = selectAssets(store.getState())
    const sellAssetChainId = fromAssetId(sellAssetId).chainId

    const result = assetIds.filter(id => {
      const assetChainId = fromAssetId(id).chainId
      const symbol = assetIdMap[id]?.symbol

      return (
        assetChainId !== sellAssetChainId && // no same-chain swaps
        (evmChainIds as readonly string[]).includes(assetChainId) &&
        (evmChainIds as readonly string[]).includes(sellAssetChainId) &&
        symbol !== undefined &&
        this.tokenMap.has(symbol)
      )
    })

    return result
  }

  /**
   * Get supported sell assetIds
   */
  filterAssetIdsBySellable(assetIds: AssetId[]): AssetId[] {
    const assetIdMap = selectAssets(store.getState())
    const result = assetIds.filter(id => {
      const symbol = assetIdMap[id]?.symbol
      return (
        (evmChainIds as readonly string[]).includes(fromAssetId(id).chainId) &&
        symbol !== undefined &&
        this.tokenMap.has(symbol)
      )
    })

    return result
  }

  /**
   * Get transactions related to a trade
   */
  async getTradeTxs(_tradeResult: TradeResult): Promise<TradeTxs> {
    return await Promise.reject(new SwapError('LifiSwapper: getTradeTxs unimplemented'))
  }
}
