import { ASSET_NAMESPACE, CHAIN_NAMESPACE, fromAssetId, fromChainId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'

import { BigAmount } from '../bigAmount/bigAmount'
import { bnOrZero } from '../bignumber/bignumber'
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

  const { assetNamespace, assetReference } = fromAssetId(asset.assetId)

  // transfer(address,uint256) is erc20's alone - erc721 and erc1155 would encode a call they
  // don't implement, so they get the address without an amount
  if (assetNamespace !== ASSET_NAMESPACE.slip44 && assetNamespace !== ASSET_NAMESPACE.erc20) {
    return `ethereum:${address}${target}`
  }

  const amount = toEip681Amount(
    BigAmount.fromPrecision({ value: amountCryptoPrecision, precision: asset.precision }).toBaseUnit(),
  )

  if (assetNamespace === ASSET_NAMESPACE.erc20) {
    return `ethereum:${assetReference}${target}/transfer?address=${address}&uint256=${amount}`
  }

  return `ethereum:${address}${target}?value=${amount}`
}

const buildSolanaUri = ({ address, asset, amountCryptoPrecision }: BuildPaymentUriArgs): string => {
  if (!amountCryptoPrecision) return address

  // Solana Pay normalises the amount, where bip21 passes whatever it was handed straight through
  const amount = bnOrZero(amountCryptoPrecision).toFixed()

  // Decimal ui units, and the recipient stays the native account rather than its ATA
  const { assetNamespace, assetReference } = fromAssetId(asset.assetId)
  if (assetNamespace === ASSET_NAMESPACE.splToken) {
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
