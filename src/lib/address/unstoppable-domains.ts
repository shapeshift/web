import { btcChainId, ethChainId } from '@shapeshiftoss/caip'
import { Resolution } from '@unstoppabledomains/resolution'
import { getConfig } from 'config'
import type {
  ResolveVanityAddress,
  ReverseLookupVanityAddress,
  ValidateVanityAddress,
} from 'lib/address/address'

let _resolution: Resolution | undefined

const getResolution = (): Resolution => {
  const ethereumProviderUrl = getConfig().REACT_APP_ETHEREUM_NODE_URL

  const polygonProviderUrl = getConfig().REACT_APP_ALCHEMY_POLYGON_URL
  if (!polygonProviderUrl)
    console.error('No Polygon provider URL found in REACT_APP_ALCHEMY_POLYGON_URL')

  if (!_resolution)
    _resolution = new Resolution({
      sourceConfig: {
        uns: {
          locations: {
            Layer1: { url: ethereumProviderUrl, network: 'mainnet' },
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
export const validateUnstoppableDomain: ValidateVanityAddress = ({ maybeAddress }) => {
  try {
    return getResolution().isSupportedDomain(maybeAddress)
  } catch (e) {
    console.error(e)
    return Promise.resolve(false)
  }
}

const chainIdToUDTicker: Record<string, string> = {
  [ethChainId]: 'ETH',
  [btcChainId]: 'BTC',
}

// resolve
export const resolveUnstoppableDomain: ResolveVanityAddress = async args => {
  const { chainId, maybeAddress: value } = args
  const ticker = chainIdToUDTicker[chainId]
  if (!ticker) {
    console.error('cannot resolve: unsupported chainId', { args })
    return ''
  }
  try {
    const result = await getResolution().addr(value, ticker)
    return result ?? ''
  } catch (e) {
    console.error(e)
    return ''
  }
}

// reverse lookup
export const reverseLookupUnstoppableDomain: ReverseLookupVanityAddress = async args => {
  const { chainId, maybeAddress } = args
  const ticker = chainIdToUDTicker[chainId]
  if (!ticker) {
    console.error('cannot resolve unstoppable domain: unsupported chainId', { args })
    return ''
  }
  try {
    const result = await getResolution().reverse(maybeAddress)
    if (result) return result
  } catch (e) {
    console.error(e)
  }
  return ''
}
