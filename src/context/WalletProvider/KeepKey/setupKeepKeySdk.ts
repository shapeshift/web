import { KeepKeySdk } from '@keepkey/keepkey-sdk'

interface PairingInfo {
  name: string
  imageUrl: string
  basePath: string
  url: string
}

interface Config {
  apiKey: string
  pairingInfo: PairingInfo
}

export const setupKeepKeySDK = async () => {
  const serviceKey = window.localStorage.getItem('@app/serviceKey') || 'notSet'
  let config: Config = {
    apiKey: serviceKey,
    pairingInfo: {
      name: 'ShapeShift',
      imageUrl: 'https://assets.coincap.io/assets/icons/fox@2x.png',
      basePath: 'http://localhost:1646/spec/swagger.json',
      url: 'https://app.shapeshift.com',
    },
  }
  const sdk = await KeepKeySdk.create(config)
  //If apiKey is revoked by wallet, or 'notSet' a user will be prompted to pair and new apiKey issued by wallet.
  if (serviceKey !== config.apiKey) {
    //store apiKey to avoid needing to pair again
    window.localStorage.setItem('@app/serviceKey', config.apiKey)
  }
  return sdk
}
