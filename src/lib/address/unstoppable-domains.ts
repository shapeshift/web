import Resolution, { SourceConfig } from '@unstoppabledomains/resolution'
import { getConfig } from 'config'

import { logger } from '../logger'
import { ResolveVanityDomain, ValidateVanityDomain } from './address'

const moduleLogger = logger.child({ namespace: ['unstoppable-domains'] })

// singleton, do not use directly or export
let _resolution: Resolution | undefined

export const getResolution = () => {
  if (!_resolution) {
    const sourceConfig: SourceConfig = {
      uns: {
        api: true,
        url: getConfig().REACT_APP_ETHEREUM_NODE_URL,
        network: 1,
      },
    }
    _resolution = new Resolution({ sourceConfig })
  }
  return _resolution
}

export const resolveUnstoppableDomain: ResolveVanityDomain = async args => {
  const { domain } = args
  const resolution = getResolution()
  try {
    const address = await resolution.addr(domain, 'eth')
    return { address, error: false }
  } catch (e) {
    moduleLogger.error(e, 'error resolving unstoppable domain')
    return { address: null, error: true }
  }
}

export const validateUnstoppableDomain: ValidateVanityDomain = domain => {
  console.info('not validating unstoppable domain', domain)
  // TODO(0xdef1cafe): regex
  return true
}
