import { btcChainId, ethChainId } from '@shapeshiftoss/caip'
import { Resolution } from '@unstoppabledomains/resolution'
import { getConfig } from 'config'
import last from 'lodash/last'
import { ResolveVanityDomain, ValidateVanityDomain } from 'lib/address/address'
import { logger } from 'lib/logger'

const moduleLogger = logger.child({ namespace: ['unstoppable-domains'] })

let _resolution: Resolution | undefined

const getResolution = (): Resolution => {
  const apiKey = last(getConfig().REACT_APP_ETHEREUM_NODE_URL.split('/')) ?? ''
  if (!apiKey) moduleLogger.error('No API key found in REACT_APP_ETHEREUM_NODE_URL')
  if (!_resolution) _resolution = Resolution.infura(apiKey)
  return _resolution
}

export const resolveUnstoppableDomain: ResolveVanityDomain = async ({ chainId, value: domain }) => {
  const chainIdToUDTicker: Record<string, string> = {
    [ethChainId]: 'ETH',
    [btcChainId]: 'BTC',
  }
  const ticker = chainIdToUDTicker[chainId]
  try {
    if (!ticker) throw new Error(`unknown chainId ${chainId}`)
    const address = await getResolution().addr(domain, ticker)
    return { address, error: false }
  } catch (e) {
    moduleLogger.trace(e, 'cannot resolve unstoppable domain')
    return { address: null, error: true }
  }
}

export const validateUnstoppableDomain: ValidateVanityDomain = async ({ value }) => {
  try {
    return getResolution().isSupportedDomain(value)
  } catch (e) {
    moduleLogger.trace(e, 'cannot validate unstoppable domain')
    return false
  }
}
