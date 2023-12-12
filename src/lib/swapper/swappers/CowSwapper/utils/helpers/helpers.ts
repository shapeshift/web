import type { LatestAppDataDocVersion } from '@cowprotocol/app-data'
import { MetadataApi, stringifyDeterministic } from '@cowprotocol/app-data'
import type { OrderClass } from '@cowprotocol/app-data/dist/generatedTypes/v0.9.0'
import type { TypedDataDomain, TypedDataField } from '@ethersproject/abstract-signer'
import type { ChainId } from '@shapeshiftoss/caip'
import { fromAssetId } from '@shapeshiftoss/caip'
import type { CowSwapOrder } from '@shapeshiftoss/swapper'
import { makeSwapErrorRight, type SwapErrorRight, SwapErrorType } from '@shapeshiftoss/swapper'
import type { Asset } from '@shapeshiftoss/types'
import { KnownChainIds } from '@shapeshiftoss/types'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import { getConfig } from 'config'
import { ethers } from 'ethers'
import { keccak256, toUtf8Bytes } from 'ethers/lib/utils.js'
import { bnOrZero, convertPrecision } from 'lib/bignumber/bignumber'
import { fromBaseUnit } from 'lib/math'

import type { CowSwapQuoteResponse } from '../../types'
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
    default:
      return Err(
        makeSwapErrorRight({
          message: '[getCowswapNetwork]',
          code: SwapErrorType.UNSUPPORTED_CHAIN,
        }),
      )
  }
}

export const getNowPlusThirtyMinutesTimestamp = (): number => {
  const ts = new Date()
  ts.setMinutes(ts.getMinutes() + 30)
  return Math.round(ts.getTime() / 1000)
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

export const assertValidTrade = ({
  buyAsset,
  sellAsset,
  supportedChainIds,
  receiveAddress,
}: {
  buyAsset: Asset
  sellAsset: Asset
  supportedChainIds: ChainId[]
  receiveAddress?: string
}): Result<boolean, SwapErrorRight> => {
  if (!supportedChainIds.includes(sellAsset.chainId)) {
    return Err(
      makeSwapErrorRight({
        message: `[CowSwap: assertValidTrade] - unsupported chainId`,
        code: SwapErrorType.UNSUPPORTED_CHAIN,
        details: { chainId: sellAsset.chainId },
      }),
    )
  }

  if (sellAsset.chainId !== buyAsset.chainId) {
    return Err(
      makeSwapErrorRight({
        message: `[CowSwap: assertValidTrade] - both assets must be on chainId ${sellAsset.chainId}`,
        code: SwapErrorType.UNSUPPORTED_PAIR,
        details: { buyAsset, sellAsset },
      }),
    )
  }

  if (fromAssetId(sellAsset.assetId).assetNamespace !== 'erc20') {
    return Err(
      makeSwapErrorRight({
        message: '[CowSwap: assertValidTrade] - Sell asset must be an ERC-20',
        code: SwapErrorType.UNSUPPORTED_PAIR,
        details: { sellAsset },
      }),
    )
  }

  if (!receiveAddress) {
    return Err(
      makeSwapErrorRight({
        message: '[CowSwap: assertValidTrade] - Receive address is required',
        code: SwapErrorType.MISSING_INPUT,
      }),
    )
  }

  return Ok(true)
}

type GetValuesFromQuoteResponseArgs = {
  buyAsset: Asset
  sellAsset: Asset
  response: CowSwapQuoteResponse
}

export const getValuesFromQuoteResponse = ({
  buyAsset,
  sellAsset,
  response,
}: GetValuesFromQuoteResponseArgs) => {
  const {
    sellAmount: sellAmountAfterFeesCryptoBaseUnit,
    feeAmount: feeAmountInSellTokenCryptoBaseUnit,
    buyAmount: buyAmountAfterFeesCryptoBaseUnit,
  } = response.quote

  const buyAmountAfterFeesCryptoPrecision = fromBaseUnit(
    buyAmountAfterFeesCryptoBaseUnit,
    buyAsset.precision,
  )

  const sellAmountCryptoPrecision = fromBaseUnit(
    sellAmountAfterFeesCryptoBaseUnit,
    sellAsset.precision,
  )

  const rate = bnOrZero(buyAmountAfterFeesCryptoPrecision).div(sellAmountCryptoPrecision).toString()
  const sellAmountBeforeFeesCryptoBaseUnit = bnOrZero(sellAmountAfterFeesCryptoBaseUnit)
    .plus(feeAmountInSellTokenCryptoBaseUnit)
    .toFixed()

  const buyAmountBeforeFeesCryptoBaseUnit = convertPrecision({
    value: sellAmountBeforeFeesCryptoBaseUnit,
    inputExponent: sellAsset.precision,
    outputExponent: buyAsset.precision,
  })
    .times(rate)
    .toFixed(0)

  return { rate, buyAmountBeforeFeesCryptoBaseUnit, buyAmountAfterFeesCryptoBaseUnit }
}

export const getSupportedChainIds = (): ChainId[] => {
  const isGnosisEnabled = getConfig().REACT_APP_FEATURE_COWSWAP_GNOSIS
  return isGnosisEnabled
    ? [KnownChainIds.GnosisMainnet, KnownChainIds.EthereumMainnet]
    : [KnownChainIds.EthereumMainnet]
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
  const appDataKeccak256 = keccak256(toUtf8Bytes(appData))

  return { fullAppData: appData, appDataKeccak256 }
}

const metadataApi = new MetadataApi()
// See https://api.cow.fi/docs/#/default/post_api_v1_quote / https://github.com/cowprotocol/app-data
export const getFullAppData = async () => {
  const APP_CODE = 'shapeshift'
  const orderClass: OrderClass = { orderClass: 'market' }
  const quote = { slippageBips: '50' }

  const appDataDoc = await metadataApi.generateAppDataDoc({
    appCode: APP_CODE,
    metadata: {
      quote,
      orderClass,
    },
  })

  const { fullAppData, appDataKeccak256 } = await generateAppDataFromDoc(appDataDoc)
  return { appDataHash: appDataKeccak256, appData: fullAppData }
}
