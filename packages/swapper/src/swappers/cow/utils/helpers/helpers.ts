import { TypedDataDomain, TypedDataField } from '@ethersproject/abstract-signer'
import { Asset, AssetService } from '@shapeshiftoss/asset-service'
import { ethAssetId, fromAssetId } from '@shapeshiftoss/caip'
import { AxiosResponse } from 'axios'
import { ethers } from 'ethers'

import { SwapError, SwapErrorType } from '../../../../api'
import { bn } from '../../../utils/bignumber'
import { CowSwapperDeps } from '../../CowSwapper'
import { CowSwapQuoteResponse } from '../../types'
import { DEFAULT_ADDRESS, DEFAULT_APP_DATA, ORDER_KIND_BUY, WETH_ASSET_ID } from '../constants'
import { cowService } from '../cowService'

const USDC_CONTRACT_ADDRESS = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'
const USDC_ASSET_PRECISION = 6

export const ORDER_TYPE_FIELDS = [
  { name: 'sellToken', type: 'address' },
  { name: 'buyToken', type: 'address' },
  { name: 'receiver', type: 'address' },
  { name: 'sellAmount', type: 'uint256' },
  { name: 'buyAmount', type: 'uint256' },
  { name: 'validTo', type: 'uint32' },
  { name: 'appData', type: 'bytes32' },
  { name: 'feeAmount', type: 'uint256' },
  { name: 'kind', type: 'string' },
  { name: 'partiallyFillable', type: 'bool' },
  { name: 'sellTokenBalance', type: 'string' },
  { name: 'buyTokenBalance', type: 'string' },
]

/**
 * EIP-712 typed data type definitions.
 */
export declare type TypedDataTypes = Record<string, TypedDataField[]>

export type CowSwapOrder = {
  sellToken: string
  buyToken: string
  sellAmount: string
  buyAmount: string
  validTo: number
  appData: string
  feeAmount: string
  kind: string
  partiallyFillable: boolean
  receiver: string
  sellTokenBalance: string
  buyTokenBalance: string
}

export type CowSwapQuoteApiInputBase = {
  appData: string
  buyToken: string
  from: string
  kind: string
  partiallyFillable: boolean
  receiver: string
  sellToken: string
  validTo: number
}

export type CowSwapSellQuoteApiInput = CowSwapQuoteApiInputBase & {
  sellAmountBeforeFee: string
}

export type CowSwapBuyQuoteApiInput = CowSwapQuoteApiInputBase & {
  buyAmountAfterFee: string
}

export const getNowPlusThirtyMinutesTimestamp = (): number => {
  const ts = new Date()
  ts.setMinutes(ts.getMinutes() + 30)
  return Math.round(ts.getTime() / 1000)
}

export const getUsdRate = async ({ apiUrl }: CowSwapperDeps, input: Asset): Promise<string> => {
  // Replacing ETH by WETH specifically for CowSwap in order to get an usd rate when called with ETH as feeAsset
  const asset = input.assetId !== ethAssetId ? input : new AssetService().getAll()[WETH_ASSET_ID]
  const { assetReference: erc20Address, assetNamespace } = fromAssetId(asset.assetId)

  if (assetNamespace !== 'erc20') {
    throw new SwapError('[getUsdRate] - unsupported asset namespace', {
      code: SwapErrorType.USD_RATE_FAILED,
      details: { assetNamespace },
    })
  }

  if (erc20Address === USDC_CONTRACT_ADDRESS) {
    return '1'
  }

  // rate is imprecise for low $ values, hence asking for $1000
  const buyAmountInDollars = 1000
  const buyAmount = bn(buyAmountInDollars)
    .times(bn(10).exponentiatedBy(USDC_ASSET_PRECISION))
    .toString()

  try {
    const apiInput: CowSwapBuyQuoteApiInput = {
      sellToken: erc20Address,
      buyToken: USDC_CONTRACT_ADDRESS,
      receiver: DEFAULT_ADDRESS,
      validTo: getNowPlusThirtyMinutesTimestamp(),
      appData: DEFAULT_APP_DATA,
      partiallyFillable: false,
      from: DEFAULT_ADDRESS,
      kind: ORDER_KIND_BUY,
      buyAmountAfterFee: buyAmount,
    }

    /**
     * /v1/quote
     * params: {
     * sellToken: contract address of token to sell
     * buyToken: contractAddress of token to buy
     * receiver: receiver address can be defaulted to "0x0000000000000000000000000000000000000000"
     * validTo: time duration during which quote is valid (eg : 1654851610 as timestamp)
     * appData: appData for the CowSwap quote that can be used later, can be defaulted to "0x0000000000000000000000000000000000000000000000000000000000000000"
     * partiallyFillable: false
     * from: sender address can be defaulted to "0x0000000000000000000000000000000000000000"
     * kind: "sell" or "buy"
     * sellAmountBeforeFee / buyAmountAfterFee: amount in base unit
     * }
     */
    const quoteResponse: AxiosResponse<CowSwapQuoteResponse> =
      await cowService.post<CowSwapQuoteResponse>(`${apiUrl}/v1/quote/`, apiInput)

    const {
      data: {
        quote: { sellAmount: sellAmountCryptoBaseUnit },
      },
    } = quoteResponse

    const sellAmountCryptoPrecision = bn(sellAmountCryptoBaseUnit).div(
      bn(10).exponentiatedBy(asset.precision),
    )

    if (!sellAmountCryptoPrecision.gt(0))
      throw new SwapError('[getUsdRate] - Failed to get sell token amount', {
        code: SwapErrorType.RESPONSE_ERROR,
      })

    // dividing $1000 by amount of sell token received
    return bn(buyAmountInDollars).div(sellAmountCryptoPrecision).toString()
  } catch (e) {
    if (e instanceof SwapError) throw e
    throw new SwapError('[getUsdRate]', {
      cause: e,
      code: SwapErrorType.USD_RATE_FAILED,
    })
  }
}

export const hashTypedData = (
  domain: TypedDataDomain,
  types: TypedDataTypes,
  data: Record<string, unknown>,
): string => {
  return ethers.utils._TypedDataEncoder.hash(domain, types, data)
}

/**
 * Compute the 32-byte signing hash for the specified order.
 * Implementation is following https://github.com/cowprotocol/contracts/blob/main/src/ts/order.ts
 * Some more ressources that can be useful :
 * https://docs.cow.fi/tutorials/how-to-submit-orders-via-the-api/4.-signing-the-order
 * https://docs.cow.fi/smart-contracts/settlement-contract/signature-schemes
 *
 * @param domain The EIP-712 domain separator to compute the hash for.
 * @param order The order to compute the digest for.
 * @return Hex-encoded 32-byte order digest.
 */
export const hashOrder = (domain: TypedDataDomain, order: CowSwapOrder): string => {
  return hashTypedData(domain, { Order: ORDER_TYPE_FIELDS }, order)
}

export const domain = (chainId: number, verifyingContract: string): TypedDataDomain => {
  return {
    name: 'Gnosis Protocol',
    version: 'v2',
    chainId,
    verifyingContract,
  }
}
