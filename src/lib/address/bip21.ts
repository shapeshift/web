import type { ChainReference } from '@shapeshiftoss/caip'
import {
  ASSET_NAMESPACE,
  ASSET_REFERENCE,
  CHAIN_NAMESPACE,
  solanaChainId,
  toAssetId,
  toChainId,
} from '@shapeshiftoss/caip'
import { parseURL as parseSolanaPayUrl } from '@solana/pay'
import bip21 from 'bip21'
import { parse as parseEthUrl } from 'eth-url-parser'
import type { Hex } from 'viem'
import { fromHex, isHex } from 'viem'

import {
  CHAIN_ID_TO_URN_SCHEME,
  DANGEROUS_ETH_URL_ERROR,
  EMPTY_ADDRESS_ERROR,
  URN_SCHEME_TO_CHAIN_ID,
} from './constants'
import type { ParseUrlDirectResult } from './types'

import { getChainAdapterManager } from '@/context/PluginProvider/chainAdapterSingleton'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import { fromBaseUnit } from '@/lib/math'
import { selectAssetById } from '@/state/slices/assetsSlice/selectors'
import { store } from '@/state/store'

export const isBip21Url = (urlOrAddress: string): boolean =>
  Object.values(CHAIN_ID_TO_URN_SCHEME).some(scheme => urlOrAddress.startsWith(`${scheme}:`))

export const isErc681Url = (urlOrAddress: string): boolean => {
  // ERC-681 enforces ethereum: prefix regardless of chain
  // Note: this doesn't mean this is an EIP-681 URL, may be its BIP-21 subset,
  // hence why we need to check for EIP-681 specific features
  if (!urlOrAddress.startsWith('ethereum:')) return false

  try {
    const parsedUrl = parseEthUrl(urlOrAddress)
    // ERC-681 specific features: chain_id, function_name, or ERC-681 specific parameters like gas, gasLimit, gasPrice
    const hasErc681Features = Boolean(parsedUrl.chain_id || parsedUrl.function_name)
    const hasErc681Params = Boolean(
      parsedUrl.parameters?.gas || parsedUrl.parameters?.gasLimit || parsedUrl.parameters?.gasPrice,
    )
    return hasErc681Features || hasErc681Params
  } catch {
    return false
  }
}

export const isSolanaPayUrl = (urlOrAddress: string): boolean => {
  // Solana Pay enforces solana: prefix
  // Note: this doesn't mean this is a Solana Pay URL, may be its BIP-21 subset,
  // hence why we need to check for Solana Pay specific params
  if (!urlOrAddress.startsWith('solana:')) return false

  try {
    // Try parsing with @solana/pay to validate it's a proper Solana Pay URL
    const parsed = parseSolanaPayUrl(urlOrAddress)

    // Check for Solana Pay-specific parameters (similar to EIP-681 feature detection)
    // A plain solana:address without parameters should not be treated as Solana Pay
    const hasSolanaPayParams = Boolean(
      'amount' in parsed ||
        'splToken' in parsed ||
        'reference' in parsed ||
        'label' in parsed ||
        'message' in parsed ||
        'memo' in parsed,
    )

    return hasSolanaPayParams
  } catch {
    return false
  }
}

/**
 * Checks if the URL is a pure BIP-21 URL, excluding EIP-681 and Solana Pay supersets.
 *
 * Pure BIP-21 URLs include:
 * - UTXO chains: bitcoin:, litecoin:, dogecoin:, bitcoincash:
 * - Cosmos chains: thorchain:, cosmos:, mayachain:
 * - EVM chains: ethereum:, base:, arbitrum:, etc. (without EIP-681 features like chain_id/@chainId)
 * - Plain Solana addresses: solana:address (without Solana Pay parameters)
 *
 * Excluded supersets:
 * - EIP-681 (EVM): ethereum: URLs with chain_id, function_name, or EVM-specific parameters
 * - Solana Pay: solana: URLs with amount, spl-token, reference, label, message, or memo
 */
export const isPureBip21Url = (urlOrAddress: string): boolean => {
  return isBip21Url(urlOrAddress) && !isErc681Url(urlOrAddress) && !isSolanaPayUrl(urlOrAddress)
}

// Individual Parsers
export const parsePureBip21 = (urlOrAddress: string): ParseUrlDirectResult => {
  const scheme = urlOrAddress.split(':')[0]
  if (!scheme || !URN_SCHEME_TO_CHAIN_ID[scheme]) {
    throw new Error('Invalid BIP-21 URL: scheme not detected')
  }

  const detectedChainId = URN_SCHEME_TO_CHAIN_ID[scheme]
  if (!detectedChainId) throw new Error('Invalid BIP-21 URL: ChainId not detected')

  const parsedUrl = bip21.decode(urlOrAddress, scheme)

  if (!parsedUrl.address) {
    throw new Error(EMPTY_ADDRESS_ERROR)
  }

  const assetId = getChainAdapterManager().get(detectedChainId)?.getFeeAssetId() ?? (() => {
    const slip44References: Record<string, string> = {
      'bip122:000000000019d6689c085ae165831e93': ASSET_REFERENCE.Bitcoin,
      'bip122:00000000001a91e3dace36e2be3bf030': ASSET_REFERENCE.Dogecoin,
      'bip122:12a765e31ffd4059bada1e25190f6e98': ASSET_REFERENCE.Litecoin,
      'bip122:000000000000000000651ef99cb9fcbe': ASSET_REFERENCE.BitcoinCash,
    }

    const slip44Reference = slip44References[detectedChainId] || ASSET_REFERENCE.Ethereum

    return toAssetId({
      chainId: detectedChainId,
      assetNamespace: ASSET_NAMESPACE.slip44,
      assetReference: slip44Reference,
    })
  })()

  const result: ParseUrlDirectResult = {
    assetId,
    maybeAddress: parsedUrl.address,
    chainId: detectedChainId,
  }

  // Add amount if it exists (including zero amounts)
  if (parsedUrl.options?.amount !== undefined) {
    result.amountCryptoPrecision = bnOrZero(parsedUrl.options.amount).toFixed()
  }

  return result
}

export const parseSolanaPay = (urlOrAddress: string): ParseUrlDirectResult => {
  const parsed = parseSolanaPayUrl(urlOrAddress)

  // Type guard to ensure we have a TransferRequestURL (not TransactionRequestURL)
  if (!('recipient' in parsed)) {
    throw new Error('Invalid Solana Pay URL: TransactionRequestURLs not supported')
  }

  const parsedSolana = parsed as any // Cast to access all properties

  if (!parsedSolana.recipient) {
    throw new Error(EMPTY_ADDRESS_ERROR)
  }

  // Determine assetId based on whether it's an SPL token or native SOL
  const assetId = parsedSolana.splToken
    ? toAssetId({
        chainId: solanaChainId,
        assetNamespace: ASSET_NAMESPACE.splToken,
        assetReference: parsedSolana.splToken.toString(),
      })
    : toAssetId({
        chainId: solanaChainId,
        assetNamespace: ASSET_NAMESPACE.slip44,
        assetReference: ASSET_REFERENCE.Solana,
      })

  return {
    assetId,
    maybeAddress: parsedSolana.recipient.toString(),
    chainId: solanaChainId,
    ...(parsedSolana.amount && {
      amountCryptoPrecision: parsedSolana.amount.toString(),
    }),
  }
}

export const parseEip681 = (urlOrAddress: string): ParseUrlDirectResult => {
  // Handle EIP-681 URLs (EVM-specific)
  const parsedUrl = parseEthUrl(urlOrAddress)

  const chainId = (() => {
    // If no chain_id specified, we can't determine chain from URL alone
    if (!parsedUrl.chain_id) {
      throw new Error('EIP-681 URL missing chain_id')
    }

    // fuarking specs mang: types say this should be a stringified number and so does the spec,
    // but in reality may be an hex string e.g ethereum:0xSomeAddy@0xa4b1 (arbitrum)
    if (isHex(parsedUrl.chain_id)) {
      return toChainId({
        chainNamespace: CHAIN_NAMESPACE.Evm,
        chainReference: fromHex(parsedUrl.chain_id as Hex, 'number').toString() as ChainReference,
      })
    }

    // Assume it's a stringified number
    return toChainId({
      chainNamespace: CHAIN_NAMESPACE.Evm,
      chainReference: parsedUrl.chain_id as ChainReference,
    })
  })()

  // https://eips.ethereum.org/EIPS/eip-681
  // Technically, `transfer` method is the only discriminator needed to detect ERC-20 transfer intents, but let's not assume specs are honoured across
  // wallets, and let's add address (destination) and target_address (contract) checks here to be sure
  // e.g `ethereum:0x89205a3a3b2a69de6dbf7f01ed13b2108b2c43e7/transfer?address=0x8e23ee67d1332ad560396262c48ffbb01f93d052&uint256=1`
  if (
    parsedUrl.function_name === 'transfer' &&
    parsedUrl.parameters?.address &&
    parsedUrl.target_address
  ) {
    if (!parsedUrl.parameters.address) {
      throw new Error(EMPTY_ADDRESS_ERROR)
    }
    const tokenAssetId = toAssetId({
      chainId,
      assetNamespace: ASSET_NAMESPACE.erc20,
      assetReference: parsedUrl.target_address.toLowerCase(),
    })

    const asset = selectAssetById(store.getState(), tokenAssetId)
    if (!asset) throw new Error(DANGEROUS_ETH_URL_ERROR)

    const amountCryptoPrecision = parsedUrl.parameters.uint256
      ? fromBaseUnit(parsedUrl.parameters.uint256, asset.precision)
      : undefined

    return {
      assetId: tokenAssetId,
      maybeAddress: parsedUrl.parameters.address,
      chainId,
      ...(amountCryptoPrecision && { amountCryptoPrecision }),
    }
  }

  // Native EVM asset transfers
  const assetId = getChainAdapterManager().get(chainId)?.getFeeAssetId()
  if (!assetId) throw new Error(`No fee asset found for chain ${chainId}`)

  const rawAmount = parsedUrl.parameters?.value ?? parsedUrl.parameters?.amount
  const asset = selectAssetById(store.getState(), assetId)
  const amountCryptoPrecision =
    rawAmount && asset ? fromBaseUnit(rawAmount, asset.precision) : undefined

  return {
    assetId,
    maybeAddress: parsedUrl.target_address ?? '',
    chainId,
    ...(amountCryptoPrecision && { amountCryptoPrecision }),
  }
}

/**
 * Parse URL directly without chain iteration
 * Returns extracted chain/asset/address/amount from URL or null for plain addresses
 */
export const parseUrlDirect = (urlOrAddress: string): ParseUrlDirectResult | null => {
  // Early return for plain addresses (not BIP-21 compatible URLs)
  if (!isBip21Url(urlOrAddress)) {
    return null
  }

  try {
    if (isPureBip21Url(urlOrAddress)) {
      return parsePureBip21(urlOrAddress)
    }

    if (isSolanaPayUrl(urlOrAddress)) {
      return parseSolanaPay(urlOrAddress)
    }

    if (isErc681Url(urlOrAddress)) {
      return parseEip681(urlOrAddress)
    }
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === DANGEROUS_ETH_URL_ERROR) throw error
      if (error.message === EMPTY_ADDRESS_ERROR) throw error
      // For other parsing errors, return null to indicate this should be treated as a plain address
    }
    return null
  }

  // We shouldn't end up here but just in case
  return null
}
