import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import { ASSET_NAMESPACE, bchChainId, btcChainId, dogeChainId, ethChainId, ltcChainId, toAssetId, toChainId, CHAIN_NAMESPACE } from '@shapeshiftoss/caip'
import bip21 from 'bip21'
import { parse as parseEthUrl } from 'eth-url-parser'
import type { Address } from 'viem'
import { fromHex } from 'viem'

import { ensReverseLookupShim } from './ens'

import { knownChainIds } from '@/constants/chains'
import { getChainAdapterManager } from '@/context/PluginProvider/chainAdapterSingleton'
import { resolveEnsDomain, validateEnsDomain } from '@/lib/address/ens'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import { fromBaseUnit } from '@/lib/math'
import { store } from '@/state/store'
import { selectAssetById } from '@/state/slices/assetsSlice/selectors'

type VanityAddressValidatorsByChainId = {
  [k: ChainId]: ValidateVanityAddress[]
}

const CHAIN_ID_TO_URN_SCHEME: Record<ChainId, string> = {
  [ethChainId]: 'ethereum',
  [btcChainId]: 'bitcoin',
  [bchChainId]: 'bitcoincash',
  [dogeChainId]: 'doge',
  [ltcChainId]: 'litecoin',
}

const DANGEROUS_ETH_URL_ERROR = 'modals.send.errors.qrDangerousEthUrl'

export const parseMaybeUrlWithChainId = ({
  assetId,
  chainId,
  urlOrAddress,
}: ParseAddressByChainIdInputArgs): ParseAddressByChainIdOutput => {
  switch (chainId) {
    case ethChainId:
      try {
        const parsedUrl = parseEthUrl(urlOrAddress)

        // Handle ERC-20 token transfers with asset validation
        if (parsedUrl.parameters?.address && parsedUrl.target_address) {
          // Convert hex chain_id to proper ChainId if available
          const actualChainId = parsedUrl.chain_id ? 
            toChainId({ 
              chainNamespace: CHAIN_NAMESPACE.Evm, 
              chainReference: fromHex(parsedUrl.chain_id as `0x${string}`, 'number').toString() as any
            }) : chainId

          // Construct potential token asset ID
          const tokenAssetId = toAssetId({ 
            chainId: actualChainId, 
            assetNamespace: ASSET_NAMESPACE.erc20, 
            assetReference: parsedUrl.target_address.toLowerCase() 
          })
          
          // Validate asset exists in store
          const state = store.getState()
          const asset = selectAssetById(state, tokenAssetId)
          
          if (!asset) {
            throw new Error(DANGEROUS_ETH_URL_ERROR)
          }
          
          // Convert amount from base units to human readable using asset precision
          let humanAmount: string | undefined
          if (parsedUrl.parameters?.uint256) {
            try {
              humanAmount = fromBaseUnit(parsedUrl.parameters.uint256, asset.precision)
            } catch (error) {
              humanAmount = undefined
            }
          }
          
          // Return with proper recipient (parameters.address) and token asset info
          return {
            assetId: tokenAssetId,
            maybeAddress: parsedUrl.parameters.address, // recipient, not contract
            chainId: actualChainId,
            ...(humanAmount ? { amountCryptoPrecision: humanAmount } : {}),
          }
        }

        // Use chain_id from QR if available for chain pre-selection
        const finalChainId = parsedUrl.chain_id ? 
          toChainId({ 
            chainNamespace: CHAIN_NAMESPACE.Evm, 
            chainReference: fromHex(parsedUrl.chain_id as `0x${string}`, 'number').toString() as any
          }) : chainId

        // For native assets with chain_id, use the correct chain's native asset
        const finalAssetId = parsedUrl.chain_id && finalChainId !== chainId ? 
          getChainAdapterManager().get(finalChainId)?.getFeeAssetId() ?? assetId 
          : assetId


        // Convert native asset amount from base units to human readable
        let humanAmount: string | undefined
        const rawAmount = parsedUrl.parameters?.value ?? parsedUrl.parameters?.amount
        if (rawAmount && finalAssetId) {
          try {
            const state = store.getState()
            const nativeAsset = selectAssetById(state, finalAssetId)
            if (nativeAsset) {
              humanAmount = fromBaseUnit(rawAmount, nativeAsset.precision)
            } else {
              humanAmount = undefined
            }
          } catch (error) {
            humanAmount = undefined
          }
        }

        return {
          assetId: finalAssetId,
          maybeAddress: parsedUrl.target_address ?? urlOrAddress,
          chainId: finalChainId, // Enables chain pre-selection for all QRs
          ...(humanAmount ? { amountCryptoPrecision: humanAmount } : {}),
        }
      } catch (error) {
        if (error instanceof Error) {
          if (error.message === DANGEROUS_ETH_URL_ERROR) throw error
          // address, not url, don't log
          if (error.message.includes('Not an Ethereum URI')) break
        }
        console.error(error)
      }
      break
    case btcChainId:
    case bchChainId:
    case dogeChainId:
    case ltcChainId:
      try {
        const urnScheme = CHAIN_ID_TO_URN_SCHEME[chainId]
        const parsedUrl = bip21.decode(urlOrAddress, urnScheme)
        return {
          assetId,
          maybeAddress: parsedUrl.address,
          chainId,
          ...(parsedUrl.options?.amount
            ? { amountCryptoPrecision: bnOrZero(parsedUrl.options.amount).toFixed() }
            : {}),
        }
      } catch (error) {
        if (error instanceof Error) {
          // address, not url, don't log
          if (error.message.includes('Invalid BIP21 URI')) break
        }
        console.error(error)
      }
      break
    default:
      return { assetId, chainId, maybeAddress: urlOrAddress }
  }

  return { assetId, chainId, maybeAddress: urlOrAddress }
}

export const parseMaybeUrl = async ({
  urlOrAddress,
}: {
  urlOrAddress: string
}): Promise<ParseMaybeUrlResult> => {
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
        // Use the asset ID from parsing if available (e.g., ERC-20 tokens), otherwise use native asset
        const finalAssetId = maybeUrl.assetId || defaultAssetId
        console.log('parseMaybeUrl returning:', {
          chainId,
          finalAssetId,
          defaultAssetId,
          parsedAssetId: maybeUrl.assetId,
          amount: maybeUrl.amountCryptoPrecision
        })
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
    } catch (error: any) {
      // We want this actual error to be rethrown as it's eventually user-facing
      if (error.message === DANGEROUS_ETH_URL_ERROR) throw error
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
