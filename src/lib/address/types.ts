import type { AssetId, ChainId } from '@shapeshiftoss/caip'

// Vanity Address Types
export type ValidateVanityAddressArgs = {
  assetId?: AssetId
  maybeAddress: string
  chainId: ChainId
}

export type ValidateVanityAddressReturn = boolean

export type ValidateVanityAddress = (
  args: ValidateVanityAddressArgs,
) => Promise<ValidateVanityAddressReturn>

export type VanityAddressValidatorsByChainId = {
  [k: ChainId]: ValidateVanityAddress[]
}

export type ResolveVanityAddressArgs = {
  assetId?: AssetId
  chainId: ChainId
  maybeAddress: string // may be any type of vanity address, e.g. a .eth or a .crypto, or a regular address on any chain
}

export type ResolveVanityAddressReturn = string

export type ResolveVanityAddress = (
  args: ResolveVanityAddressArgs,
) => Promise<ResolveVanityAddressReturn>

export type VanityAddressResolversByChainId = {
  [k: ChainId]: ResolveVanityAddress[]
}

export type ReverseLookupVanityAddressArgs = {
  chainId: ChainId
  maybeAddress: string
}

export type ReverseLookupVanityAddressReturn = string

export type ReverseLookupVanityAddress = (
  args: ReverseLookupVanityAddressArgs,
) => Promise<ReverseLookupVanityAddressReturn>

export type ReverseResolversByChainId = {
  [k: ChainId]: ReverseLookupVanityAddress[]
}

// Address Validation Types
export type ValidateAddressArgs = {
  chainId: ChainId
  maybeAddress: string
}

export type ValidateAddressReturn = boolean

export type ValidateAddressByChainId = (args: ValidateAddressArgs) => Promise<ValidateAddressReturn>

// Parse Address Input Types
export type ParseAddressInputArgs = {
  assetId?: AssetId
  urlOrAddress: string
  amountCryptoPrecision?: string
  disableUrlParsing?: boolean
}

export type ParseAddressByChainIdInputArgs = ParseAddressInputArgs & {
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

// NEW: URL Direct Parsing Types
export type ParseUrlDirectResult = {
  chainId: ChainId
  assetId: AssetId
  maybeAddress: string
  amountCryptoPrecision?: string
}
