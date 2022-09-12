import { btcChainId, ethChainId } from '@shapeshiftoss/caip'
import { Resolution } from '@unstoppabledomains/resolution'
import { getConfig } from 'config'
import last from 'lodash/last'
import type {
  ResolveVanityAddress,
  ReverseLookupVanityAddress,
  ValidateVanityAddress,
} from 'lib/address/address'
import { logger } from 'lib/logger'

const moduleLogger = logger.child({ namespace: ['unstoppable-domains'] })

let _resolution: Resolution | undefined

const getResolution = (): Resolution => {
  const infuraApiKey = last(getConfig().REACT_APP_ETHEREUM_NODE_URL.split('/')) ?? ''
  if (!infuraApiKey) moduleLogger.error('No API key found in REACT_APP_ETHEREUM_NODE_URL')
  const infuraProviderUrl = `https://mainnet.infura.io/v3/${infuraApiKey}`

  const polygonProviderUrl = getConfig().REACT_APP_ALCHEMY_POLYGON_URL
  if (!polygonProviderUrl)
    moduleLogger.error('No Polygon provider URL found in REACT_APP_ALCHEMY_POLYGON_URL')

  if (!_resolution)
    _resolution = new Resolution({
      sourceConfig: {
        uns: {
          locations: {
            Layer1: { url: infuraProviderUrl, network: 'mainnet' },
            Layer2: {
              url: polygonProviderUrl,
              network: 'polygon-mainnet',
            },
          },
        },
      },
    })
  return _resolution
}

// validate
export const validateUnstoppableDomain: ValidateVanityAddress = async ({ value }) => {
  try {
    return getResolution().isSupportedDomain(value)
  } catch (e) {
    moduleLogger.trace(e, 'cannot validate unstoppable domain')
    return false
  }
}

const chainIdToUDTicker: Record<string, string> = {
  [ethChainId]: 'ETH',
  [btcChainId]: 'BTC',
}

// resolve
export const resolveUnstoppableDomain: ResolveVanityAddress = async args => {
  const { chainId, value } = args
  const ticker = chainIdToUDTicker[chainId]
  if (!ticker) {
    moduleLogger.error({ args }, 'cannot resolve: unsupported chainId')
    return ''
  }
  try {
    return getResolution().addr(value, ticker)
  } catch (e) {
    moduleLogger.trace(e, 'cannot resolve')
    return ''
  }
}

// reverse lookup
export const reverseLookupUnstoppableDomain: ReverseLookupVanityAddress = async args => {
  const { chainId } = args
  const ticker = chainIdToUDTicker[chainId]
  if (!ticker) {
    moduleLogger.error({ chainId }, 'cannot resolve unstoppable domain: unsupported chainId')
    return ''
  }
  // TODO(0xdef1cafe): uncomment this once this is actually published - docs are wrong
  // https://unstoppabledomains.github.io/resolution/v7.0.0/classes/resolution.html#reverse
  // try {
  //   const result = await getResolution().reverse(value, ticker)
  //   if (result) return result
  // } catch (e) {
  //   moduleLogger.trace(e, 'cannot resolve')
  // }
  return ''
}
