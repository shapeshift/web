import type { TypedDataDomain, TypedDataField } from '@ethersproject/abstract-signer'
import { KnownChainIds } from '@shapeshiftoss/types'
import type { Result } from '@sniptt/monads'
import { Ok } from '@sniptt/monads/build'
import { ethers } from 'ethers'
import type { SwapErrorRight } from 'lib/swapper/api'
import { SwapError, SwapErrorType } from 'lib/swapper/api'

import type { CowswapSupportedChainAdapter } from '../../types'
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
  quoteId: string
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

export const getCowswapNetwork = (
  adapter: CowswapSupportedChainAdapter,
): Result<CowNetwork, SwapErrorRight> => {
  switch (adapter.getChainId()) {
    case KnownChainIds.EthereumMainnet:
      return Ok(CowNetwork.Mainnet)
    case KnownChainIds.GnosisMainnet:
      return Ok(CowNetwork.Xdai)
    default:
      throw new SwapError('[getCowswapNetwork]', {
        code: SwapErrorType.UNSUPPORTED_CHAIN,
      })
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
