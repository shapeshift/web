import Resolution from '@unstoppabledomains/resolution'

import { logger } from './logger'

const moduleLogger = logger.child({ namespace: ['unstoppable-domains'] })

// singleton, do not use directly or export
let _resolution: Resolution | undefined

export const getResolution = () => {
  if (!_resolution) {
    _resolution = new Resolution()
  }
  return _resolution
}

type ResolveUnstoppableDomainArgs = {
  domain: string
}
type ResolveUnstoppableDomain = (args: ResolveUnstoppableDomainArgs) => Promise<string>

export const resolveUnstoppableDomain: ResolveUnstoppableDomain = async args => {
  const { domain } = args
  const resolution = getResolution()
  return (async () => {
    try {
      const address = await resolution.addr(domain, 'ETH')
      return address
    } catch (e) {
      moduleLogger.error(e, 'error resolving unstoppable domain')
      return ''
    }
  })()
}
