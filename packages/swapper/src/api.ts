import { CAIP19 } from '@shapeshiftoss/caip'
import { HDWallet } from '@shapeshiftoss/hdwallet-core'
import {
  ApprovalNeededInput,
  ApprovalNeededOutput,
  ApproveInfiniteInput,
  Asset,
  BuildQuoteTxInput,
  ChainTypes,
  ExecQuoteInput,
  ExecQuoteOutput,
  GetQuoteInput,
  MinMaxOutput,
  Quote,
  SwapperType
} from '@shapeshiftoss/types'

export type SupportedAssetInput = {
  assetIds: CAIP19[]
}

export type ByPairInput = {
  sellAssetId: CAIP19
  buyAssetId: CAIP19
}

export type BuyAssetBySellIdInput = {
  sellAssetId: CAIP19
  assetIds: CAIP19[]
}

export type SupportedSellAssetsInput = {
  assetIds: CAIP19[]
}

export class SwapError extends Error {}

export interface Swapper {
  /** Returns the swapper type */
  getType(): SwapperType

  /**
   * Get a Quote along with an unsigned transaction that can be signed and broadcast to execute the swap
   **/
  buildQuoteTx(args: BuildQuoteTxInput): Promise<Quote<ChainTypes>>

  /**
   * Get a basic quote (rate) for a trading pair
   */
  getQuote(input: GetQuoteInput, wallet?: HDWallet): Promise<Quote<ChainTypes>>

  /**
   * Get the usd rate from either the assets symbol or tokenId
   */
  getUsdRate(input: Pick<Asset, 'symbol' | 'tokenId'>): Promise<string>

  /**
   * Get the minimum and maximum trade value of the sellAsset and buyAsset
   */
  getMinMax(input: GetQuoteInput): Promise<MinMaxOutput>

  /**
   * Execute a quote built with buildQuoteTx by signing and broadcasting
   */
  executeQuote(args: ExecQuoteInput<ChainTypes>): Promise<ExecQuoteOutput>

  /**
   * Get a boolean if a quote needs approval
   */
  approvalNeeded(args: ApprovalNeededInput<ChainTypes>): Promise<ApprovalNeededOutput>

  /**
   * Get the txid of an approve infinite transaction
   */
  approveInfinite(args: ApproveInfiniteInput<ChainTypes>): Promise<string>

  /**
   * Get supported buyAssetId's by sellAssetId
   */
  filterBuyAssetsBySellAssetId(args: BuyAssetBySellIdInput): CAIP19[]

  /**
   * Get supported sell assetIds
   */
  filterAssetIdsBySellable(assetIds: CAIP19[]): CAIP19[]
}
