import type { LatestAppDataDocVersion } from '@cowprotocol/app-data'
import { MetadataApi, stringifyDeterministic } from '@cowprotocol/app-data'
import type { OrderClass } from '@cowprotocol/app-data/dist/generatedTypes/v0.9.0'
import type { ChainId } from '@shapeshiftoss/caip'
import { fromAssetId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { KnownChainIds } from '@shapeshiftoss/types'
import {
  bn,
  bnOrZero,
  convertBasisPointsToDecimalPercentage,
  convertDecimalPercentageToBasisPoints,
  convertPrecision,
  fromBaseUnit,
} from '@shapeshiftoss/utils'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import type { TypedData } from 'eip-712'
import type { TypedDataDomain, TypedDataField } from 'ethers'
import { keccak256, stringToBytes } from 'viem'

import type { CowSwapOrder, SwapErrorRight } from '../../../../types'
import { TradeQuoteError } from '../../../../types'
import { makeSwapErrorRight } from '../../../../utils'
import { getTreasuryAddressFromChainId } from '../../../utils/helpers/helpers'
import type { AffiliateAppDataFragment, CowSwapQuoteResponse } from '../../types'
import { CowNetwork } from '../../types'

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

export type CowSwapQuoteApiInputBase = {
  appData: string
  appDataHash?: string
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

export const getCowswapNetwork = (chainId: ChainId): Result<CowNetwork, SwapErrorRight> => {
  switch (chainId) {
    case KnownChainIds.EthereumMainnet:
      return Ok(CowNetwork.Mainnet)
    case KnownChainIds.GnosisMainnet:
      return Ok(CowNetwork.Xdai)
    case KnownChainIds.ArbitrumMainnet:
      return Ok(CowNetwork.ArbitrumOne)
    default:
      return Err(
        makeSwapErrorRight({
          message: '[getCowswapNetwork]',
          code: TradeQuoteError.UnsupportedChain,
        }),
      )
  }
}

export const getNowPlusThirtyMinutesTimestamp = (): number => {
  const ts = new Date()
  ts.setMinutes(ts.getMinutes() + 30)
  return Math.round(ts.getTime() / 1000)
}

export const getSignTypeDataPayload = (
  domain: TypedDataDomain,
  order: Omit<CowSwapOrder, 'signingScheme' | 'quoteId' | 'appDataHash'>,
): TypedData => {
  return {
    // Mismatch of types between ethers' TypedDataDomain and TypedData :shrugs:
    domain: domain as Record<string, unknown>,
    primaryType: 'Order',
    types: {
      Order: ORDER_TYPE_FIELDS,
      EIP712Domain: [
        { name: 'name', type: 'string' },
        { name: 'version', type: 'string' },
        { name: 'chainId', type: 'uint256' },
        { name: 'verifyingContract', type: 'address' },
      ],
    },
    message: order,
  }
}

export const domain = (chainId: number, verifyingContract: string): TypedDataDomain => {
  return {
    name: 'Gnosis Protocol',
    version: 'v2',
    chainId,
    verifyingContract,
  }
}

export const assertValidTrade = ({
  buyAsset,
  sellAsset,
  supportedChainIds,
}: {
  buyAsset: Asset
  sellAsset: Asset
  supportedChainIds: ChainId[]
}): Result<boolean, SwapErrorRight> => {
  if (!supportedChainIds.includes(sellAsset.chainId)) {
    return Err(
      makeSwapErrorRight({
        message: `[CowSwap: assertValidTrade] - unsupported chainId`,
        code: TradeQuoteError.UnsupportedChain,
        details: { chainId: sellAsset.chainId },
      }),
    )
  }

  if (sellAsset.chainId !== buyAsset.chainId) {
    return Err(
      makeSwapErrorRight({
        message: `[CowSwap: assertValidTrade] - both assets must be on chainId ${sellAsset.chainId}`,
        code: TradeQuoteError.CrossChainNotSupported,
        details: { buyAsset, sellAsset },
      }),
    )
  }

  if (fromAssetId(sellAsset.assetId).assetNamespace !== 'erc20') {
    return Err(
      makeSwapErrorRight({
        message: '[CowSwap: assertValidTrade] - Sell asset must be an ERC-20',
        code: TradeQuoteError.UnsupportedTradePair,
        details: { sellAsset },
      }),
    )
  }

  return Ok(true)
}

type GetValuesFromQuoteResponseArgs = {
  buyAsset: Asset
  sellAsset: Asset
  response: CowSwapQuoteResponse
  affiliateBps: string
}

export const deductAffiliateFeesFromAmount = ({
  amount,
  affiliateBps,
}: {
  amount: string
  affiliateBps: string
}) => {
  const hasAffiliateFee = bnOrZero(affiliateBps).gt(0)
  if (!hasAffiliateFee) return amount

  return bn(amount)
    .times(bn(1).minus(convertBasisPointsToDecimalPercentage(affiliateBps)))
    .toFixed(0)
}

export const deductSlippageFromAmount = ({
  amount,
  slippageTolerancePercentageDecimal,
}: {
  amount: string
  slippageTolerancePercentageDecimal: string
}) => {
  return bn(amount).minus(bn(amount).times(slippageTolerancePercentageDecimal))
}

export const getValuesFromQuoteResponse = ({
  buyAsset,
  sellAsset,
  response,
  affiliateBps,
}: GetValuesFromQuoteResponseArgs) => {
  const {
    sellAmount: sellAmountAfterFeesCryptoBaseUnit,
    feeAmount: feeAmountInSellTokenCryptoBaseUnit,
    buyAmount,
  } = response.quote

  // Remove affiliate fees off the buyAmount to get the amount after affiliate fees, but before slippage bips
  const buyAmountAfterAffiliateFeesCryptoBaseUnit = deductAffiliateFeesFromAmount({
    amount: buyAmount,
    affiliateBps,
  })

  const buyAmountAfterAffiliateFeesCryptoPrecision = fromBaseUnit(
    buyAmountAfterAffiliateFeesCryptoBaseUnit,
    buyAsset.precision,
  )

  const sellAmountCryptoPrecision = fromBaseUnit(
    sellAmountAfterFeesCryptoBaseUnit,
    sellAsset.precision,
  )

  const rate = bnOrZero(buyAmountAfterAffiliateFeesCryptoPrecision)
    .div(sellAmountCryptoPrecision)
    .toString()

  const sellAmountBeforeFeesCryptoBaseUnit = bnOrZero(sellAmountAfterFeesCryptoBaseUnit)
    .plus(feeAmountInSellTokenCryptoBaseUnit)
    .toFixed()

  const buyAmountBeforeAffiliateAndProtocolFeesCryptoBaseUnit = convertPrecision({
    value: sellAmountBeforeFeesCryptoBaseUnit,
    inputExponent: sellAsset.precision,
    outputExponent: buyAsset.precision,
  })
    .times(rate)
    .toFixed(0)

  return {
    rate,
    buyAmountBeforeFeesCryptoBaseUnit: buyAmountBeforeAffiliateAndProtocolFeesCryptoBaseUnit,
    buyAmountAfterFeesCryptoBaseUnit: buyAmountAfterAffiliateFeesCryptoBaseUnit,
  }
}

type AppDataInfo = {
  doc: LatestAppDataDocVersion
  fullAppData: string
  appDataKeccak256: string
  env?: string
}

const generateAppDataFromDoc = async (
  doc: LatestAppDataDocVersion,
): Promise<Pick<AppDataInfo, 'fullAppData' | 'appDataKeccak256'>> => {
  const appData = await stringifyDeterministic(doc)
  const appDataKeccak256 = keccak256(stringToBytes(appData))

  return { fullAppData: appData, appDataKeccak256 }
}

const metadataApi = new MetadataApi()
// See https://api.cow.fi/docs/#/default/post_api_v1_quote / https://github.com/cowprotocol/app-data
export const getFullAppData = async (
  slippageTolerancePercentage: string,
  affiliateAppDataFragment: AffiliateAppDataFragment,
) => {
  const APP_CODE = 'shapeshift'
  const orderClass: OrderClass = { orderClass: 'market' }
  const quote = {
    slippageBips: convertDecimalPercentageToBasisPoints(slippageTolerancePercentage).toString(),
  }

  const appDataDoc = await metadataApi.generateAppDataDoc({
    appCode: APP_CODE,
    metadata: {
      quote,
      orderClass,
      ...affiliateAppDataFragment,
    },
  })

  const { fullAppData, appDataKeccak256 } = await generateAppDataFromDoc(appDataDoc)
  return { appDataHash: appDataKeccak256, appData: fullAppData }
}

export const getAffiliateAppDataFragmentByChainId = ({
  affiliateBps,
  chainId,
}: {
  affiliateBps: string
  chainId: ChainId
}): AffiliateAppDataFragment => {
  const hasAffiliateFee = bnOrZero(affiliateBps).gt(0)
  if (!hasAffiliateFee) return {}

  return {
    partnerFee: {
      bps: Number(affiliateBps),
      recipient: getTreasuryAddressFromChainId(chainId),
    },
  }
}
