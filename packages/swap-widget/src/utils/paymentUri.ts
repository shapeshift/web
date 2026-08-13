import { ASSET_NAMESPACE, fromAssetId } from '@shapeshiftoss/caip'

import type { Asset } from '../types'
import {
  COSMOS_CHAIN_IDS,
  formatAmountForInput,
  getChainType,
  getEvmNetworkId,
  UTXO_CHAIN_IDS,
} from '../types'

// Mirrors the web app's CHAIN_ID_TO_URN_SCHEME, which is what parses these back
const BIP21_URI_SCHEMES: Record<string, string> = {
  [UTXO_CHAIN_IDS.bitcoin]: 'bitcoin',
  [UTXO_CHAIN_IDS.bitcoinCash]: 'bitcoincash',
  [UTXO_CHAIN_IDS.dogecoin]: 'dogecoin',
  [UTXO_CHAIN_IDS.litecoin]: 'litecoin',
  [COSMOS_CHAIN_IDS.cosmos]: 'cosmos',
  [COSMOS_CHAIN_IDS.thorchain]: 'thorchain',
  [COSMOS_CHAIN_IDS.mayachain]: 'mayachain',
}

// BIP-21 takes decimal coin units
const buildBip21Uri = (address: string, asset: Asset, amountCryptoBaseUnit: string): string => {
  const scheme = BIP21_URI_SCHEMES[asset.chainId]
  if (!scheme) return address

  // CashAddr already carries its scheme
  const target = address.startsWith(`${scheme}:`) ? address.slice(scheme.length + 1) : address
  const amount = formatAmountForInput(amountCryptoBaseUnit, asset.precision)

  return `${scheme}:${target}?amount=${amount}`
}

// EIP-681 takes atomic units, and the chain id is what stops a wallet paying on the wrong network
const buildEvmUri = (address: string, asset: Asset, amountCryptoBaseUnit: string): string => {
  const { assetNamespace, assetReference } = fromAssetId(asset.assetId)
  const chainId = getEvmNetworkId(asset.chainId)

  if (assetNamespace === ASSET_NAMESPACE.slip44) {
    return `ethereum:${address}@${chainId}?value=${amountCryptoBaseUnit}`
  }

  // A token transfer targets the contract, so the deposit address moves into the call's arguments
  return `ethereum:${assetReference}@${chainId}/transfer?address=${address}&uint256=${amountCryptoBaseUnit}`
}

// Solana Pay takes decimal ui units, and the recipient stays the native account rather than its ATA
const buildSolanaUri = (address: string, asset: Asset, amountCryptoBaseUnit: string): string => {
  const { assetNamespace, assetReference } = fromAssetId(asset.assetId)
  const amount = formatAmountForInput(amountCryptoBaseUnit, asset.precision)

  if (assetNamespace === ASSET_NAMESPACE.slip44) return `solana:${address}?amount=${amount}`

  return `solana:${address}?amount=${amount}&spl-token=${assetReference}`
}

/**
 * A payment URI carrying both the deposit address and the exact amount, so a scanning wallet
 * prefills what the user would otherwise retype. Chains with no scheme fall back to the bare
 * address, which every wallet reads.
 */
export const buildPaymentUri = (
  address: string,
  asset: Asset,
  amountCryptoBaseUnit: string,
): string => {
  switch (getChainType(asset.chainId)) {
    case 'utxo':
    case 'cosmos':
      return buildBip21Uri(address, asset, amountCryptoBaseUnit)
    case 'evm':
      return buildEvmUri(address, asset, amountCryptoBaseUnit)
    case 'solana':
      return buildSolanaUri(address, asset, amountCryptoBaseUnit)
    default:
      return address
  }
}
