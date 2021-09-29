import { Asset } from '@shapeshiftoss/asset-service'
import { HDWallet } from '@shapeshiftoss/hdwallet-core'

export enum SwapperType {
  Zrx = '0x',
  Thorchain = 'Thorchain'
}

export class SwapError extends Error {}

export interface FeeData {
  fee?: string
  gas?: string
  estimatedGas?: string
  gasPrice?: string
  approvalFee?: string
  protocolFee?: string
  minimumProtocolFee?: string
  receiveNetworkFee?: string
}

export type SwapSource = {
  name: string
  proportion: string
}

export interface QuoteResponse {
  price: string
  guaranteedPrice: string
  to: string
  data?: string
  value?: string
  gas?: string
  estimatedGas?: string
  gasPrice?: string
  protocolFee?: string
  minimumProtocolFee?: string
  buyTokenAddress?: string
  sellTokenAddress?: string
  buyAmount?: string
  sellAmount?: string
  allowanceTarget?: string
  sources?: Array<SwapSource>
}
export interface Quote {
  success: boolean
  statusCode?: number
  statusReason?: string
  sellAssetAccountId?: string
  buyAssetAccountId?: string
  sellAsset: Asset
  buyAsset: Asset
  rate?: string
  depositAddress?: string // this is dex contract address for eth swaps
  receiveAddress?: string
  buyAmount?: string
  sellAmount?: string
  minimum?: string | null
  maximum?: string | null
  guaranteedPrice?: string
  slipScore?: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  txData?: any // unsigned tx if available at quote time
  value?: string
  feeData?: FeeData
  allowanceContract?: string
  allowanceGrantRequired?: boolean
  slippage?: string
  priceImpact?: string
  orderId?: string
  sources?: Array<SwapSource>
  timestamp?: number
}

export interface GetQuoteInput {
  sellAsset: Asset
  buyAsset: Asset
  sellAmount?: string
  buyAmount?: string
  sellAssetAccountId?: string
  buyAssetAccountId?: string
  slippage?: string
  priceImpact?: string
  sendMax?: boolean
  minimumPrice?: string
  minimum?: string
}

export type BuildQuoteTxArgs = {
  input: GetQuoteInput
  wallet: HDWallet
}

export interface Swapper {
  /** Returns the swapper type */
  getType(): SwapperType

  /**
   * Get a Quote along with an unsigned transaction that can be signed and broadcast to execute the swap
   * @param input
   * @param wallet
   **/
  buildQuoteTx(args: BuildQuoteTxArgs): Promise<Quote | undefined>

  /**
   * Get a basic quote (rate) for a trading pair
   * @param input
   */
  getQuote(input: GetQuoteInput, wallet?: HDWallet): Promise<Quote | undefined>

  /**
   * Get a list of available assets based on the array of assets you send it
   * @param assets
   */
  getAvailableAssets(assets: Asset[]): Asset[]

  /**
   * Get a boolean if the trade pair will work
   * @param sellAsset
   * @param buyAsset
   */
  canTradePair(sellAsset: Asset, buyAsset: Asset): boolean
}
