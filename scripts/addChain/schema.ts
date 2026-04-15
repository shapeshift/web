export type ChainConfig = {
  camelName: string
  pascalName: string
  upperName: string
  chainId: number
  viemChainName: string
  nativeSymbol: string
  nativeName: string
  nativePrecision: number
  isNativeEth: boolean
  color: string
  networkIconUrl: string
  nativeIconUrl: string
  explorerUrl: string
  explorerAddressLink: string
  explorerTxLink: string
  rpcUrl: string
  publicRpcUrls: string[]
  coingeckoPlatform: string
  wrappedNativeAddress: string | null
  relatedAssetKey: string
  shortName: string
  swappers: {
    relay: { supported: boolean; relayChainId?: number }
    across: { supported: boolean }
    portals: { supported: boolean }
    zerion: { supported: boolean }
    yieldxyz: { supported: boolean }
  }
}

const requiredStrings = [
  'camelName',
  'pascalName',
  'upperName',
  'viemChainName',
  'nativeSymbol',
  'nativeName',
  'color',
  'networkIconUrl',
  'nativeIconUrl',
  'explorerUrl',
  'explorerAddressLink',
  'explorerTxLink',
  'rpcUrl',
  'coingeckoPlatform',
  'relatedAssetKey',
  'shortName',
] as const

const requiredSwapperKeys = ['relay', 'across', 'portals', 'zerion', 'yieldxyz'] as const

export function validateConfig(obj: unknown): ChainConfig {
  if (!obj || typeof obj !== 'object') {
    throw new Error('Config must be a non-null object')
  }

  const c = obj as Record<string, unknown>

  for (const key of requiredStrings) {
    if (typeof c[key] !== 'string' || (c[key] as string).length === 0) {
      throw new Error(`"${key}" must be a non-empty string, got: ${JSON.stringify(c[key])}`)
    }
  }

  if (typeof c.chainId !== 'number' || !Number.isInteger(c.chainId) || c.chainId <= 0) {
    throw new Error(`"chainId" must be a positive integer, got: ${JSON.stringify(c.chainId)}`)
  }

  if (
    typeof c.nativePrecision !== 'number' ||
    !Number.isInteger(c.nativePrecision) ||
    c.nativePrecision < 0
  ) {
    throw new Error(
      `"nativePrecision" must be a non-negative integer, got: ${JSON.stringify(c.nativePrecision)}`,
    )
  }

  if (typeof c.isNativeEth !== 'boolean') {
    throw new Error(`"isNativeEth" must be a boolean, got: ${JSON.stringify(c.isNativeEth)}`)
  }

  if (!Array.isArray(c.publicRpcUrls)) {
    throw new Error(`"publicRpcUrls" must be an array, got: ${JSON.stringify(c.publicRpcUrls)}`)
  }
  for (const url of c.publicRpcUrls) {
    if (typeof url !== 'string') {
      throw new Error(`"publicRpcUrls" entries must be strings, got: ${JSON.stringify(url)}`)
    }
  }

  if (c.wrappedNativeAddress !== null && typeof c.wrappedNativeAddress !== 'string') {
    throw new Error(
      `"wrappedNativeAddress" must be a string or null, got: ${JSON.stringify(
        c.wrappedNativeAddress,
      )}`,
    )
  }
  if (
    typeof c.wrappedNativeAddress === 'string' &&
    (c.wrappedNativeAddress as string).trim().length === 0
  ) {
    throw new Error(
      '"wrappedNativeAddress" must be null or a non-empty string, not an empty string',
    )
  }

  if (!c.swappers || typeof c.swappers !== 'object') {
    throw new Error(`"swappers" must be an object`)
  }

  const swappers = c.swappers as Record<string, unknown>
  for (const key of requiredSwapperKeys) {
    const entry = swappers[key]
    if (!entry || typeof entry !== 'object') {
      throw new Error(`"swappers.${key}" must be an object`)
    }
    if (typeof (entry as Record<string, unknown>).supported !== 'boolean') {
      throw new Error(`"swappers.${key}.supported" must be a boolean`)
    }
  }

  const relayEntry = (c.swappers as Record<string, unknown>).relay as Record<string, unknown>
  if (relayEntry.supported === true && typeof relayEntry.relayChainId !== 'number') {
    throw new Error('"swappers.relay.relayChainId" must be a number when relay is supported')
  }

  return c as unknown as ChainConfig
}
