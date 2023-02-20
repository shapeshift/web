import type { PairingInfo } from '@keepkey/keepkey-sdk'
import { KeepKeySdk } from '@keepkey/keepkey-sdk'
import { foxAssetId } from '@shapeshiftoss/caip'
import { store } from 'state/store'

type Config = {
  apiKey: string
  pairingInfo: PairingInfo
}

export const setupKeepKeySDK = async () => {
  const serviceKey = window.localStorage.getItem('@app/serviceKey') || ''
  const imageUrl = store.getState().assets.byId[foxAssetId]?.icon || ''

  const config: Config = {
    apiKey: serviceKey,
    pairingInfo: {
      name: 'ShapeShift',
      imageUrl,
      url: 'https://app.shapeshift.com',
    },
  }

  const sdk = await KeepKeySdk.create(config)

  /**
   * NOTE - the KeepKeySdk.create() call mutates the config it's passed in...
   * so even though this may have been an empty string before, it might be populated now
   */
  config.apiKey && window.localStorage.setItem('@app/serviceKey', config.apiKey)

  return sdk
}
