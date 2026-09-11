import { ASSET_NAMESPACE, CHAIN_NAMESPACE, fromAssetId, fromChainId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'

import { BigAmount } from '../bigAmount/bigAmount'
import { bn } from '../bignumber/bignumber'
import { CHAIN_ID_TO_URN_SCHEME } from './constants'

export type BuildPaymentUriArgs = {
  address: string
  asset: Pick<Asset, 'assetId' | 'chainId' | 'precision'>
  amountCryptoPrecision?: string
}

const toBaseUnit = (asset: BuildPaymentUriArgs['asset'], amountCryptoPrecision: string): string =>
  BigAmount.fromPrecision({ value: amountCryptoPrecision, precision: asset.precision }).toBaseUnit()

// EIP-681 encourages scientific notation, and writes it without the exponent's plus sign
const toEip681Amount = (amountCryptoBaseUnit: string): string =>
  bn(amountCryptoBaseUnit).toExponential().replace('+', '').replace('e0', '')

const buildEvmUri = ({ address, asset, amountCryptoPrecision }: BuildPaymentUriArgs): string => {
  const target = `@${Number(fromChainId(asset.chainId).chainReference)}`
  const { assetNamespace, assetReference } = fromAssetId(asset.assetId)

  // transfer(address,uint256) is erc20's alone, so erc721 and erc1155 get no amount
  const takesAmount =
    assetNamespace === ASSET_NAMESPACE.slip44 || assetNamespace === ASSET_NAMESPACE.erc20
  if (!amountCryptoPrecision || !takesAmount) return `ethereum:${address}${target}`

  const amount = toEip681Amount(toBaseUnit(asset, amountCryptoPrecision))

  return assetNamespace === ASSET_NAMESPACE.erc20
    ? `ethereum:${assetReference}${target}/transfer?address=${address}&uint256=${amount}`
    : `ethereum:${address}${target}?value=${amount}`
}

const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'

// The same check as web3.js's PublicKey: base58 that decodes to exactly 32 bytes
const isSolanaPublicKey = (address: string): boolean => {
  let value = 0n
  for (const char of address) {
    const digit = BASE58_ALPHABET.indexOf(char)
    if (digit === -1) return false
    value = value * 58n + BigInt(digit)
  }
  const leadingZeroBytes = address.length - address.replace(/^1+/, '').length
  const significantBytes = value === 0n ? 0 : Math.ceil(value.toString(16).length / 2)
  return leadingZeroBytes + significantBytes === 32
}

const buildSolanaUri = ({ address, asset, amountCryptoPrecision }: BuildPaymentUriArgs): string => {
  if (!amountCryptoPrecision) return address
  if (!isSolanaPublicKey(address)) throw new Error(`Invalid Solana address: ${address}`)

  // Solana Pay normalises the amount rather than passing it through verbatim
  const amount = bn(amountCryptoPrecision).toFixed()

  const { assetNamespace, assetReference } = fromAssetId(asset.assetId)
  if (assetNamespace === ASSET_NAMESPACE.splToken) {
    // Solana Pay takes decimal ui units, and the recipient is the native account, not its ATA
    return `solana:${address}?amount=${amount}&spl-token=${assetReference}`
  }

  return `solana:${address}?amount=${amount}`
}

const buildTonUri = ({ address, asset, amountCryptoPrecision }: BuildPaymentUriArgs): string => {
  if (!amountCryptoPrecision) return address

  const { assetNamespace, assetReference } = fromAssetId(asset.assetId)
  const amount = toBaseUnit(asset, amountCryptoPrecision)

  // A jetton transfer names its master contract, and its amount is in the jetton's own units
  if (assetNamespace === ASSET_NAMESPACE.jetton) {
    return `ton://transfer/${address}?jetton=${assetReference}&amount=${amount}`
  }

  return `ton://transfer/${address}?amount=${amount}`
}

// BIP-21 takes decimal coin units
const buildBip21Uri = ({ address, asset, amountCryptoPrecision }: BuildPaymentUriArgs): string => {
  const scheme = CHAIN_ID_TO_URN_SCHEME[asset.chainId]
  if (!amountCryptoPrecision || !scheme) return address

  // CashAddr already carries its scheme
  const target = address.startsWith(`${scheme}:`) ? address.slice(scheme.length + 1) : address

  return `${scheme}:${target}?amount=${amountCryptoPrecision}`
}

export const buildPaymentUri = (args: BuildPaymentUriArgs): string => {
  const { amountCryptoPrecision } = args
  if (amountCryptoPrecision) {
    const amount = bn(amountCryptoPrecision)
    if (!amount.isFinite() || amount.isNegative()) {
      throw new Error(`Invalid payment amount: ${amountCryptoPrecision}`)
    }
  }

  switch (fromChainId(args.asset.chainId).chainNamespace) {
    case CHAIN_NAMESPACE.Utxo:
    case CHAIN_NAMESPACE.CosmosSdk:
      return buildBip21Uri(args)
    case CHAIN_NAMESPACE.Evm:
      return buildEvmUri(args)
    case CHAIN_NAMESPACE.Solana:
      return buildSolanaUri(args)
    case CHAIN_NAMESPACE.Ton:
      return buildTonUri(args)
    default:
      return args.address
  }
}
