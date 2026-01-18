import { Factory, MAINNET_FACTORY_ADDR } from '@dedust/sdk'
import type { OpenedContract } from '@ton/core'
import { TonClient4 } from '@ton/ton'

import { DEDUST_TON_V4_ENDPOINT } from './constants'

let cachedClient: TonClient4 | null = null
let cachedFactory: OpenedContract<Factory> | null = null

export const dedustClientManager = {
  getClient: (): TonClient4 => {
    if (!cachedClient) {
      cachedClient = new TonClient4({ endpoint: DEDUST_TON_V4_ENDPOINT })
    }
    return cachedClient
  },

  getFactory: (): OpenedContract<Factory> => {
    if (!cachedFactory) {
      const client = dedustClientManager.getClient()
      cachedFactory = client.open(Factory.createFromAddress(MAINNET_FACTORY_ADDR))
    }
    return cachedFactory
  },

  disconnect: (): void => {
    cachedClient = null
    cachedFactory = null
  },
}
