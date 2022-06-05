import { btcChainId, ChainId, ethChainId } from '@shapeshiftoss/caip'
import { Resolution } from '@unstoppabledomains/resolution'
import { getConfig } from 'config'
import last from 'lodash/last'
import { ResolveVanityDomain, ValidateVanityDomain } from 'lib/address/address'
import { logger } from 'lib/logger'

const moduleLogger = logger.child({ namespace: ['unstoppable-domains'] })

let _resolution: Resolution | undefined

const getResolution = (): Resolution => {
  const apiKey = last(getConfig().REACT_APP_ETHEREUM_NODE_URL.split('/')) ?? ''
  if (!_resolution) _resolution = Resolution.infura(apiKey)
  return _resolution
}

const parseableKeys = ['crypto.BTC.address', 'crypto.ETH.address'] as const

type ParseableKey = typeof parseableKeys[number]
export type UnstoppableDomainsData = {
  records: Record<ParseableKey | string, string>
  meta: Record<string, string | number>
}

type AddressesByChainId = {
  [chainId: ChainId]: string
}
type ParseUnstoppableDomainsData = (data: UnstoppableDomainsData) => AddressesByChainId

export const parseUnstoppableDomainsResult: ParseUnstoppableDomainsData = data => {
  const initial: AddressesByChainId = {}
  return Object.entries(data.records).reduce((acc, [k, v]) => {
    if (!parseableKeys.includes(k as ParseableKey)) return acc
    switch (k) {
      case 'crypto.BTC.address':
        acc[btcChainId] = v // don't lowercase btc addresses
        break
      case 'crypto.ETH.address':
        acc[ethChainId] = v.toLowerCase()
        break
      default: {
        break
      }
    }
    return acc
  }, initial)
}

export const resolveUnstoppableDomain: ResolveVanityDomain = async args => {
  const { domain } = args
  try {
    const address = await getResolution().addr(domain, 'ETH')
    return { address, error: false }
  } catch (e) {
    moduleLogger.trace(e, 'error resolving unstoppable domain')
    return { address: null, error: true }
  }
}

export const validateUnstoppableDomain: ValidateVanityDomain = async hostname => {
  try {
    const result = await getResolution().isSupportedDomain(hostname)
    return result
  } catch (e) {
    console.info(e)
    return false
  }
}
