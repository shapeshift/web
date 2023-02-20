import type { PairingInfo } from '@keepkey/keepkey-sdk'
import { KeepKeySdk } from '@keepkey/keepkey-sdk'
import { foxAssetId } from '@shapeshiftoss/caip'
import { store } from 'state/store'

type Config = {
  apiKey: string
  pairingInfo: PairingInfo
}

export const setupKeepKeySDK = async () => {
  // is `notSet` some magic value?
  const serviceKey = window.localStorage.getItem('@app/serviceKey') || 'notSet'
  const imageUrl = store.getState().assets.byId[foxAssetId]?.icon || ''

  /**
   * NOTE - the KeepKeySdk.create() call mutates the config it's passed in...
   */
  const config: Config = {
    apiKey: serviceKey,
    pairingInfo: {
      name: 'ShapeShift',
      imageUrl,
      url: 'https://app.shapeshift.com',
    },
  }

  const sdk = await KeepKeySdk.create(config)

  // If apiKey is revoked by wallet, or 'notSet' a user will be prompted to pair and new apiKey issued by wallet.
  if (serviceKey !== config.apiKey) {
    // store apiKey to avoid needing to pair again
    window.localStorage.setItem('@app/serviceKey', config.apiKey)
  }

  return sdk
}
