import { adapters, AssetId } from '@shapeshiftoss/caip'
import { Asset, SupportedChainIds } from '@shapeshiftoss/types'

import {
  ApprovalNeededOutput,
  BuyAssetBySellIdInput,
  GetMinMaxInput,
  MinMaxOutput,
  SwapError,
  SwapErrorTypes,
  Swapper,
  SwapperType,
  Trade,
  TradeQuote,
  TradeResult,
  TradeTxs
} from '../../api'
import { MidgardResponse, ThorchainSwapperDeps } from './types'
import { getUsdRate } from './utils/getUsdRate/getUsdRate'
import { thorService } from './utils/thorService'

export class ThorchainSwapper implements Swapper {
  private supportedAssetIds: AssetId[] = []
  deps: ThorchainSwapperDeps

  constructor(deps: ThorchainSwapperDeps) {
    this.deps = deps
  }

  async initialize() {
    try {
      const { data: responseData } = await thorService.get<MidgardResponse[]>(
        `${this.deps.midgardUrl}/pools`
      )

      const supportedAssetIds = responseData.reduce<AssetId[]>((acc, midgardPool) => {
        const assetId = adapters.poolAssetIdToAssetId(midgardPool.asset)
        if (!assetId) return acc
        acc.push(assetId)
        return acc
      }, [])

      this.supportedAssetIds = supportedAssetIds
    } catch (e) {
      throw new SwapError('[thorchainInitialize]: initialize failed to set supportedAssetIds', {
        code: SwapErrorTypes.INITIALIZE_FAILED,
        cause: e
      })
    }
  }

  getType() {
    return SwapperType.Thorchain
  }

  getUsdRate(input: Pick<Asset, 'symbol' | 'assetId'>): Promise<string> {
    return getUsdRate({ deps: this.deps, input })
  }

  getMinMax(input: GetMinMaxInput): Promise<MinMaxOutput> {
    console.info(input)
    throw new Error('ThorchainSwapper: getMinMax unimplemented')
  }

  async approvalNeeded(): Promise<ApprovalNeededOutput> {
    throw new Error('ThorchainSwapper: approvalNeeded unimplemented')
  }

  async approveInfinite(): Promise<string> {
    throw new Error('ThorchainSwapper: approveInfinite unimplemented')
  }

  filterBuyAssetsBySellAssetId(args: BuyAssetBySellIdInput): AssetId[] {
    const { assetIds = [], sellAssetId } = args
    return assetIds.filter(
      (assetId) => this.supportedAssetIds.includes(assetId) && assetId !== sellAssetId
    )
  }

  filterAssetIdsBySellable(): AssetId[] {
    return this.supportedAssetIds
  }

  async buildTrade(): Promise<Trade<SupportedChainIds>> {
    throw new Error('ThorchainSwapper: buildTrade unimplemented')
  }

  async getTradeQuote(): Promise<TradeQuote<SupportedChainIds>> {
    throw new Error('ThorchainSwapper: getTradeQuote unimplemented')
  }

  async executeTrade(): Promise<TradeResult> {
    throw new Error('ThorchainSwapper: executeTrade unimplemented')
  }

  async getTradeTxs(): Promise<TradeTxs> {
    throw new Error('ThorchainSwapper: executeTrade unimplemented')
  }
}
