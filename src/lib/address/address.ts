import type { AssetId, ChainId, ChainReference } from '@shapeshiftoss/caip'
import {
  ASSET_NAMESPACE,
  ASSET_REFERENCE,
  CHAIN_NAMESPACE,
  ethChainId,
  solanaChainId,
  toAssetId,
  toChainId,
} from '@shapeshiftoss/caip'
import { parseURL as parseSolanaPayUrl } from '@solana/pay'
import bip21 from 'bip21'
import { parse as parseEthUrl } from 'eth-url-parser'
import type { Address, Hex } from 'viem'
import { fromHex, isHex } from 'viem'

import {
  CHAIN_ID_TO_URN_SCHEME,
  DANGEROUS_ETH_URL_ERROR,
  URN_SCHEME_TO_CHAIN_ID,
} from './constants'
import { ensReverseLookupShim } from './ens'

import { knownChainIds } from '@/constants/chains'
import { getChainAdapterManager } from '@/context/PluginProvider/chainAdapterSingleton'
import { resolveEnsDomain, validateEnsDomain } from '@/lib/address/ens'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import { fromBaseUnit } from '@/lib/math'
import { isUtxoChainId } from '@/lib/utils/utxo'
import { selectAssetById } from '@/state/slices/assetsSlice/selectors'
import { store } from '@/state/store'

type VanityAddressValidatorsByChainId = {
  [k: ChainId]: ValidateVanityAddress[]
}

const isBip21Url = (urlOrAddress: string): boolean =>
  Object.values(CHAIN_ID_TO_URN_SCHEME).some(scheme => urlOrAddress.startsWith(`${scheme}:`))

const isErc681Url = (urlOrAddress: string): boolean => {
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

const isSolanaPayUrl = (urlOrAddress: string): boolean => {
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
 * Checks if the URL is a pure BIP-21 URL, excluding EVM (EIP-681) and Solana Pay supersets.
 *
 * Pure BIP-21 URLs include:
 * - UTXO chains: bitcoin:, litecoin:, dogecoin:, bitcoincash:
 * - Cosmos chains: thorchain:, cosmos:, mayachain:
 * - Plain Solana addresses: solana:address (without Solana Pay parameters)
 *
 * Excluded supersets:
 * - EIP-681 (EVM): ethereum: URLs with special EVM features
 * - Solana Pay: solana: URLs with amount, spl-token, reference, label, message, or memo
 */
const isPureBip21Url = (urlOrAddress: string): boolean => {
  return isBip21Url(urlOrAddress) && !isErc681Url(urlOrAddress) && !isSolanaPayUrl(urlOrAddress)
}

export const parseMaybeUrlWithChainId = ({
  assetId: inputAssetId,
  chainId: inputChainId,
  urlOrAddress,
}: ParseAddressByChainIdInputArgs): ParseAddressByChainIdOutput => {
  console.log(urlOrAddress)

  // Early return for plain addresses (not BIP-21 compatible URLs)
  if (!isBip21Url(urlOrAddress)) {
    return { assetId: inputAssetId, chainId: inputChainId, maybeAddress: urlOrAddress }
  }

  if (isPureBip21Url(urlOrAddress)) {
    const scheme = urlOrAddress.split(':')[0]
    if (!scheme || !URN_SCHEME_TO_CHAIN_ID[scheme]) {
      throw new Error('Invalid BIP-21 URL: scheme not detected')
    }

    const detectedChainId = URN_SCHEME_TO_CHAIN_ID[scheme]
    if (!detectedChainId) throw new Error('Invalid BIP-21 URL: ChainId not detected')

    const parsedUrl = bip21.decode(urlOrAddress, scheme)

    // Determine final chainId and assetId based on detected vs input chain
    const chainId = detectedChainId === inputChainId ? inputChainId : detectedChainId
    const assetId = (() => {
      // If detected chain matches input and we have an input assetId, use it
      if (detectedChainId === inputChainId && inputAssetId) {
        return inputAssetId
      }

      // For UTXO chains, if we're parsing with the correct chain, use the input assetId
      if (isUtxoChainId(detectedChainId) && detectedChainId === inputChainId) {
        return inputAssetId
      }

      // Otherwise, get the fee asset for the detected chain
      return (
        getChainAdapterManager().get(detectedChainId)?.getFeeAssetId() ||
        toAssetId({
          chainId: detectedChainId,
          assetNamespace: ASSET_NAMESPACE.slip44,
          assetReference: ASSET_REFERENCE.Ethereum,
        })
      )
    })()

    return {
      assetId,
      maybeAddress: parsedUrl.address,
      chainId,
      ...(parsedUrl.options?.amount && {
        amountCryptoPrecision: bnOrZero(parsedUrl.options.amount).toFixed(),
      }),
    }
  }

  // Branch 2: Handle Solana Pay URLs
  if (isSolanaPayUrl(urlOrAddress)) {
    const parsed = parseSolanaPayUrl(urlOrAddress)

    // Type guard to ensure we have a TransferRequestURL (not TransactionRequestURL)
    if (!('recipient' in parsed)) {
      throw new Error('Invalid Solana Pay URL: TransactionRequestURLs not supported')
    }

    const parsedSolana = parsed as any // Cast to access all properties

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

  // Branch 3: Handle EIP-681 URLs
  if (isErc681Url(urlOrAddress)) {
    try {
      // Handle EIP-681 URLs (EVM-specific)
      const parsedUrl = parseEthUrl(urlOrAddress)

      const chainId = (() => {
        if (!parsedUrl.chain_id) return inputChainId

        // fuarking specs mang: types say this should be a stringified number and so does the spec,
        // but in reality may be an hex string e.g ethereum:0xSomeAddy@0xa4b1 (arbitrum)
        if (isHex(parsedUrl.chain_id)) {
          return toChainId({
            chainNamespace: CHAIN_NAMESPACE.Evm,
            chainReference: fromHex(
              parsedUrl.chain_id as Hex,
              'number',
            ).toString() as ChainReference,
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
      const assetId = inputAssetId || getChainAdapterManager().get(chainId)?.getFeeAssetId()

      const rawAmount = parsedUrl.parameters?.value ?? parsedUrl.parameters?.amount
      const asset = selectAssetById(store.getState(), assetId ?? '')
      const amountCryptoPrecision =
        rawAmount && asset ? fromBaseUnit(rawAmount, asset.precision) : undefined

      return {
        assetId,
        maybeAddress: parsedUrl.target_address ?? urlOrAddress,
        chainId,
        ...(amountCryptoPrecision && { amountCryptoPrecision }),
      }
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === DANGEROUS_ETH_URL_ERROR) throw error
        // address, not url, don't log
        if (error.message.includes('Not an Ethereum URI')) {
          // If EIP-681 parsing fails, fall through to plain address handling
        } else {
          console.error(error)
        }
      }
    }
  }

  // We shouldn't end up here but just in case
  throw new Error('Unhandled URL parsing case')
}

export const parseMaybeUrl = async ({
  urlOrAddress,
}: {
  urlOrAddress: string
}): Promise<ParseMaybeUrlResult> => {
  console.log(urlOrAddress)
  // Iterate over supportedChainIds
  for (const chainId of knownChainIds) {
    try {
      const maybeUrl = parseMaybeUrlWithChainId({ chainId, urlOrAddress })
      const isValidUrl = maybeUrl.maybeAddress !== urlOrAddress

      const adapter = getChainAdapterManager().get(chainId)

      if (!adapter) throw new Error('Adapter not found')

      const defaultAssetId = adapter.getFeeAssetId()
      // Validation succeeded, and we now have a ChainId
      if (isValidUrl) {
        const finalAssetId = maybeUrl.assetId || defaultAssetId
        return {
          chainId,
          value: urlOrAddress,
          assetId: finalAssetId,
          amountCryptoPrecision: maybeUrl.amountCryptoPrecision,
        }
      }

      // Validation was unsuccessful, but this may still be a valid address for this adapter
      const isValidAddress = await validateAddress({ chainId, maybeAddress: urlOrAddress })
      if (isValidAddress) {
        return {
          chainId,
          value: urlOrAddress,
          assetId: defaultAssetId,
        }
      }
    } catch (error) {
      // We want this actual error to be rethrown as it's eventually user-facing
      if (error instanceof Error && error.message === DANGEROUS_ETH_URL_ERROR) throw error
      // All other errors means error validating the *current* ChainId, not an actual error but the normal flow as we exhaust ChainIds parsing.
      // Swallow the error and continue
    }
  }

  // Validation failed for all ChainIds. Now this is an actual error.
  throw new Error('Address not found in QR code')
}

// validators - is a given value a valid vanity address, e.g. a .eth or a .crypto
const getVanityAddressValidatorsByChain = (): VanityAddressValidatorsByChainId => {
  return {
    [ethChainId]: [validateEnsDomain],
  }
}

type ValidateVanityAddressArgs = {
  assetId?: AssetId
  maybeAddress: string
  chainId: ChainId
}
type ValidateVanityAddressReturn = boolean
export type ValidateVanityAddress = (
  args: ValidateVanityAddressArgs,
) => Promise<ValidateVanityAddressReturn>

export const validateVanityAddress: ValidateVanityAddress = async args => {
  const vanityAddressValidatorsByChain = getVanityAddressValidatorsByChain()
  const validators = vanityAddressValidatorsByChain[args.chainId] ?? []
  for (const validator of validators) {
    try {
      const result = await validator(args)
      if (result) return result
    } catch (e) {} // expected
  }
  return false
}

// resolvers - given a vanity address and a chainId, resolve it to an on chain address
export type ResolveVanityAddressArgs = {
  assetId?: AssetId
  chainId: ChainId
  maybeAddress: string // may be any type of vanity address, e.g. a .eth or a .crypto, or a regular address on any chain
}

export type ResolveVanityAddressReturn = string

export type ResolveVanityAddress = (
  args: ResolveVanityAddressArgs,
) => Promise<ResolveVanityAddressReturn>

type VanityAddressResolversByChainId = {
  [k: ChainId]: ResolveVanityAddress[]
}

const getVanityResolversByChainId = (): VanityAddressResolversByChainId => {
  return {
    [ethChainId]: [resolveEnsDomain],
  }
}

export const resolveVanityAddress: ResolveVanityAddress = async args => {
  const vanityResolversByChainId = getVanityResolversByChainId()

  for (const resolver of vanityResolversByChainId[args.chainId]) {
    try {
      const result = await resolver(args)
      if (result) return result
    } catch (e) {}
  }
  return ''
}

// reverse search - given a on chain address, resolve it to a vanity address
type ReverseLookupVanityAddressArgs = {
  chainId: ChainId
  maybeAddress: string
}
export type ReverseLookupVanityAddressReturn = string
export type ReverseLookupVanityAddress = (
  args: ReverseLookupVanityAddressArgs,
) => Promise<ReverseLookupVanityAddressReturn>

type ReverseResolversByChainId = {
  [k: ChainId]: ReverseLookupVanityAddress[]
}

const reverseLookupResolversByChainId: ReverseResolversByChainId = {
  [ethChainId]: [ensReverseLookupShim],
}

export const reverseLookupVanityAddress: ReverseLookupVanityAddress = async args => {
  const resolvers = reverseLookupResolversByChainId[args.chainId] ?? []
  for (const resolver of resolvers) {
    try {
      const result = await resolver(args)
      if (result) return result
    } catch (e) {}
  }
  return '' as Address
}

// validate a given address
type ValidateAddressArgs = {
  chainId: ChainId
  maybeAddress: string
}
type ValidateAddressReturn = boolean
export type ValidateAddressByChainId = (args: ValidateAddressArgs) => Promise<ValidateAddressReturn>

export const validateAddress: ValidateAddressByChainId = async ({ chainId, maybeAddress }) => {
  try {
    const adapter = getChainAdapterManager().get(chainId)
    if (!adapter) return false
    return (await adapter.validateAddress(maybeAddress)).valid
  } catch (e) {
    return false
  }
}

type ParseAddressInputArgs = {
  assetId?: AssetId
  urlOrAddress: string
  amountCryptoPrecision?: string
  disableUrlParsing?: boolean
}

/**
 * given a value, which may be invalid input, a valid address, or a variety of vanity domains
 * and a chainId, return an object containing and address and vanityAddress
 * which may both be empty strings, one may be empty, or both may be populated
 */
type ParseAddressByChainIdInputArgs = ParseAddressInputArgs & {
  chainId: ChainId
}

export type ParseAddressByChainIdOutput = {
  assetId?: AssetId
  maybeAddress: string
  amountCryptoPrecision?: string
  chainId: ChainId
}

export type ParseAddressInputReturn = {
  address: string
  vanityAddress: string
  amountCryptoPrecision?: string
  chainId: ChainId
}

export type ParseMaybeUrlResult = {
  assetId?: AssetId
  chainId: ChainId
  value: string
  amountCryptoPrecision?: string
}

export type ParseAddressByChainIdInput = (
  args: ParseAddressByChainIdInputArgs,
) => Promise<ParseAddressInputReturn>

export type ParseAddressInput = (
  args: ParseAddressInputArgs,
) => Promise<ParseAddressInputReturn | undefined>

// Parses an address or vanity address for a **known** ChainId
export const parseAddressInputWithChainId: ParseAddressByChainIdInput = async args => {
  const { assetId, chainId, amountCryptoPrecision } = args
  const maybeParsedArgs = args.disableUrlParsing
    ? {
        assetId,
        maybeAddress: args.urlOrAddress,
        amountCryptoPrecision,
        chainId,
      }
    : parseMaybeUrlWithChainId(args)

  const isValidAddress = await validateAddress(maybeParsedArgs)
  // we're dealing with a valid address
  if (isValidAddress) {
    const vanityAddress = await reverseLookupVanityAddress(maybeParsedArgs)
    // return a valid address, and a possibly blank or populated vanity address
    return {
      address: maybeParsedArgs.maybeAddress,
      vanityAddress,
      chainId,
      amountCryptoPrecision: maybeParsedArgs.amountCryptoPrecision,
    }
  }
  // at this point it's not a valid address, but may not be a vanity address
  const isVanityAddress = await validateVanityAddress(maybeParsedArgs)
  // it's neither a valid address nor a vanity address
  if (!isVanityAddress) return { address: '', vanityAddress: '', chainId }
  // at this point it's a valid vanity address, let's resolve it
  const address = await resolveVanityAddress(maybeParsedArgs)
  return { address, vanityAddress: maybeParsedArgs.maybeAddress, chainId }
}

// Parses an address or vanity address for an **unknown** ChainId, exhausting known ChainIds until we maybe find a match
export const parseAddressInput: ParseAddressInput = async args => {
  for (const chainId of knownChainIds) {
    const parsedArgs = parseMaybeUrlWithChainId(Object.assign(args, { chainId }))

    const isValidAddress = await validateAddress(parsedArgs)
    // we're dealing with a valid address
    if (isValidAddress) {
      const vanityAddress = await reverseLookupVanityAddress(parsedArgs)
      // return a valid address, and a possibly blank or populated vanity address
      return { address: parsedArgs.maybeAddress, vanityAddress, chainId }
    }
    // at this point it's not a valid address, but may be a vanity address
    const isVanityAddress = await validateVanityAddress(parsedArgs)
    // it's neither a valid address nor a vanity address, try the next chainId
    if (!isVanityAddress) continue
    // at this point it may be a valid vanity address for this ChainId, let's resolve it
    const address = await resolveVanityAddress(parsedArgs)

    // All failed, try the next chainId
    if (!address) continue
    return { address, vanityAddress: parsedArgs.maybeAddress, chainId }
  }
}
