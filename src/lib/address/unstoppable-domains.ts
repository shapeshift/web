import { btcChainId, ethChainId } from '@shapeshiftoss/caip'
import { Resolution } from '@unstoppabledomains/resolution'
import { getConfig } from 'config'
import last from 'lodash/last'
import {
  ResolveVanityAddress,
  ReverseLookupVanityAddress,
  ValidateVanityAddress,
} from 'lib/address/address'
import { logger } from 'lib/logger'

const moduleLogger = logger.child({ namespace: ['unstoppable-domains'] })

let _resolution: Resolution | undefined

const getResolution = (): Resolution => {
  const apiKey = last(getConfig().REACT_APP_ETHEREUM_NODE_URL.split('/')) ?? ''
  if (!apiKey) moduleLogger.error('No API key found in REACT_APP_ETHEREUM_NODE_URL')
  if (!_resolution) _resolution = Resolution.infura(apiKey)
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
  const { chainId, value } = args
  const ticker = chainIdToUDTicker[chainId]
  if (!ticker) {
    moduleLogger.error({ chainId }, 'cannot resolve unstoppable domain: unsupported chainId')
    return ''
  }
  // removed after 7.0.0, apparently, only works for ens, realistically doesn't work at all?
  // https://unstoppabledomains.github.io/resolution/v1.17.0/classes/resolution.html#reverse
  try {
    const result = await getResolution().reverse(value, ticker)
    if (result) return result
  } catch (e) {
    moduleLogger.trace(e, 'cannot resolve')
  }
  return ''
}
