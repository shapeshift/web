import { CHAIN_NAMESPACE, fromAssetId, fromChainId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'

import { BigAmount } from '../bigAmount/bigAmount'
import { bnOrZero } from '../bignumber/bignumber'
import { isToken } from '../isToken'
import { CHAIN_ID_TO_URN_SCHEME } from './constants'

export type BuildPaymentUriArgs = {
  address: string
  asset: Pick<Asset, 'assetId' | 'chainId' | 'precision'>
  amountCryptoPrecision?: string
}

// EIP-681 encourages scientific notation, and writes it without the exponent's plus sign
const toEip681Amount = (amountCryptoBaseUnit: string): string =>
  bnOrZero(amountCryptoBaseUnit).toExponential().replace('+', '').replace('e0', '')

const buildEvmUri = ({ address, asset, amountCryptoPrecision }: BuildPaymentUriArgs): string => {
  const { chainReference } = fromChainId(asset.chainId)
  const target = `@${Number(chainReference)}`

  if (!amountCryptoPrecision) return `ethereum:${address}${target}`

  const amountCryptoBaseUnit = BigAmount.fromPrecision({
    value: amountCryptoPrecision,
    precision: asset.precision,
  }).toBaseUnit()
  const amount = toEip681Amount(amountCryptoBaseUnit)

  // A token transfer targets the contract, so the destination moves into the call's arguments
  if (isToken(asset.assetId)) {
    const { assetReference } = fromAssetId(asset.assetId)
    return `ethereum:${assetReference}${target}/transfer?address=${address}&uint256=${amount}`
  }

  return `ethereum:${address}${target}?value=${amount}`
}

const buildSolanaUri = ({ address, asset, amountCryptoPrecision }: BuildPaymentUriArgs): string => {
  if (!amountCryptoPrecision) return address

  // Solana Pay normalises the amount, where bip21 passes whatever it was handed straight through
  const amount = bnOrZero(amountCryptoPrecision).toFixed()

  // Decimal ui units, and the recipient stays the native account rather than its ATA
  if (isToken(asset.assetId)) {
    const { assetReference } = fromAssetId(asset.assetId)
    return `solana:${address}?amount=${amount}&spl-token=${assetReference}`
  }

  return `solana:${address}?amount=${amount}`
}

// BIP-21 takes decimal coin units
const buildBip21Uri = ({ address, asset, amountCryptoPrecision }: BuildPaymentUriArgs): string => {
  const scheme = CHAIN_ID_TO_URN_SCHEME[asset.chainId]
  if (!amountCryptoPrecision || !scheme) return address

  // CashAddr already carries its scheme
  const target = address.startsWith(`${scheme}:`) ? address.slice(scheme.length + 1) : address

  return `${scheme}:${target}?amount=${amountCryptoPrecision}`
}

// Chains with no scheme get their bare address back, which every wallet still reads
export const buildPaymentUri = (args: BuildPaymentUriArgs): string => {
  switch (fromChainId(args.asset.chainId).chainNamespace) {
    case CHAIN_NAMESPACE.Utxo:
    case CHAIN_NAMESPACE.CosmosSdk:
      return buildBip21Uri(args)
    case CHAIN_NAMESPACE.Evm:
      return buildEvmUri(args)
    case CHAIN_NAMESPACE.Solana:
      return buildSolanaUri(args)
    default:
      return args.address
  }
}
