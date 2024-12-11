import type { LatestAppDataDocVersion } from '@cowprotocol/app-data'
import { MetadataApi, stringifyDeterministic } from '@cowprotocol/app-data'
import type { OrderClass, OrderClass1 } from '@cowprotocol/app-data/dist/generatedTypes/v1.3.0'
import type { ChainId } from '@shapeshiftoss/caip'
import { ASSET_NAMESPACE, fromChainId, toAssetId } from '@shapeshiftoss/caip'
import type { EvmChainAdapter, SignTypedDataInput } from '@shapeshiftoss/chain-adapters'
import { toAddressNList } from '@shapeshiftoss/chain-adapters'
import type { ETHSignTypedData, HDWallet } from '@shapeshiftoss/hdwallet-core'
import type { AccountMetadata, TypedDataTypes, UnsignedOrderCreation } from '@shapeshiftoss/types'
import { CowNetwork, KnownChainIds, TypedDataPrimaryType } from '@shapeshiftoss/types'
import {
  bnOrZero,
  convertDecimalPercentageToBasisPoints,
  getNativeFeeAssetReference,
} from '@shapeshiftoss/utils'
import type { TypedData } from 'eip-712'
import type { TypedDataDomain } from 'ethers'
import { ethers } from 'ethers'
import type { Address } from 'viem'
import { keccak256, stringToBytes } from 'viem'

import type { AffiliateAppDataFragment } from '../swappers/CowSwapper'
import { getTreasuryAddressFromChainId } from '../swappers/utils/helpers/helpers'
import {
  CANCELLATIONS_TYPE_FIELDS,
  COW_SWAP_NATIVE_ASSET_MARKER_ADDRESS,
  COW_SWAP_SETTLEMENT_ADDRESS,
  ORDER_TYPE_FIELDS,
} from './constants'

export * from './constants'

export const getCowNetwork = (chainId: ChainId): CowNetwork | undefined => {
  switch (chainId) {
    case KnownChainIds.EthereumMainnet:
      return CowNetwork.Mainnet
    case KnownChainIds.GnosisMainnet:
      return CowNetwork.Xdai
    case KnownChainIds.ArbitrumMainnet:
      return CowNetwork.ArbitrumOne
    default:
      return
  }
}

const cowDomain = (chainId: number, verifyingContract: string): TypedDataDomain => {
  return {
    name: 'Gnosis Protocol',
    version: 'v2',
    chainId,
    verifyingContract,
  }
}

export const assertGetCowNetwork = (chainId: ChainId): CowNetwork => {
  const maybeNetwork = getCowNetwork(chainId)
  if (!maybeNetwork) throw Error('Unsupported chain')
  return maybeNetwork
}

export const signCowMessage = async (
  typedData: TypedData,
  chainAdapter: EvmChainAdapter,
  accountMetadata: AccountMetadata,
  wallet: HDWallet,
) => {
  const { bip44Params } = accountMetadata
  const typedDataToSign: ETHSignTypedData = {
    addressNList: toAddressNList(bip44Params),
    typedData,
  }

  const signTypedDataInput: SignTypedDataInput<ETHSignTypedData> = {
    typedDataToSign,
    wallet,
  }

  const signedTypeData = await chainAdapter.signTypedData(signTypedDataInput)

  // Passing the signature through split/join to normalize the `v` byte.
  // Some wallets do not pad it with `27`, which causes a signature failure
  // `splitSignature` pads it if needed, and `joinSignature` simply puts it back together
  const signature = ethers.Signature.from(ethers.Signature.from(signedTypeData)).serialized

  return signature
}

const getSignTypeDataPayload = (
  chainId: ChainId,
  primaryType: TypedDataPrimaryType,
  types: TypedDataTypes,
  message: Record<string, unknown>,
): TypedData => {
  const { chainReference } = fromChainId(chainId)
  const signingDomain = Number(chainReference)
  const typedDataDomain = cowDomain(signingDomain, COW_SWAP_SETTLEMENT_ADDRESS)
  return {
    // Mismatch of types between ethers' TypedDataDomain and TypedData :shrugs:
    domain: typedDataDomain as Record<string, unknown>,
    primaryType,
    types: {
      ...types,
      EIP712Domain: [
        { name: 'name', type: 'string' },
        { name: 'version', type: 'string' },
        { name: 'chainId', type: 'uint256' },
        { name: 'verifyingContract', type: 'address' },
      ],
    },
    message,
  }
}

export const signCowOrder = async (
  unsignedOrderCreation: UnsignedOrderCreation,
  chainId: ChainId,
  signMessage: (typedData: TypedData) => Promise<string>,
) => {
  // Removes the types that aren't part of GpV2Order types or structured signing will fail
  const { signingScheme, quoteId, appDataHash, appData, receiver, ...rest } = unsignedOrderCreation

  if (!appDataHash) throw Error('missing appDataHash')
  if (!receiver) throw Error('missing receiver')

  const message = {
    ...rest,
    receiver,
    // The order we're signing requires the appData to be a hash, not the stringified doc
    // However, the request we're making to *send* the order to the API requires both appData and appDataHash in their original form
    // see https://github.com/cowprotocol/cowswap/blob/a11703f4e93df0247c09d96afa93e13669a3c244/apps/cowswap-frontend/src/legacy/utils/trade.ts#L236
    appData: appDataHash,
  }

  const typedData = getSignTypeDataPayload(
    chainId,
    TypedDataPrimaryType.Order,
    { Order: ORDER_TYPE_FIELDS },
    message,
  )

  const signature = await signMessage(typedData)

  return signature
}

export const signCowOrderCancellation = async (
  orderUid: string,
  chainId: ChainId,
  signMessage: (typedData: TypedData) => Promise<string>,
) => {
  const typedData = getSignTypeDataPayload(
    chainId,
    TypedDataPrimaryType.OrderCancellations,
    { OrderCancellations: CANCELLATIONS_TYPE_FIELDS },
    { orderUids: [orderUid] },
  )

  const signature = await signMessage(typedData)

  return signature
}

export const cowSwapTokenToAssetId = (chainId: ChainId, cowSwapToken: Address) => {
  const { chainNamespace, chainReference } = fromChainId(chainId)
  return cowSwapToken.toLowerCase() === COW_SWAP_NATIVE_ASSET_MARKER_ADDRESS.toLowerCase()
    ? toAssetId({
        chainId,
        assetNamespace: 'slip44',
        assetReference: getNativeFeeAssetReference(chainNamespace, chainReference),
      })
    : toAssetId({
        chainId,
        assetNamespace: ASSET_NAMESPACE.erc20,
        assetReference: cowSwapToken,
      })
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
  orderClass1: OrderClass1,
) => {
  const APP_CODE = 'shapeshift'
  const orderClass: OrderClass = { orderClass: orderClass1 }
  const quote = {
    slippageBips: convertDecimalPercentageToBasisPoints(slippageTolerancePercentage).toNumber(),
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
