import { KeepKeySdk } from '@keepkey/keepkey-sdk'

export const setupKeepKeySDK = async () => {
  let serviceKey = window.localStorage.getItem('@app/serviceKey')
  let config: any = {
    apiKey: serviceKey,
    pairingInfo: {
      name: 'ShapeShift',
      imageUrl: 'https://assets.coincap.io/assets/icons/fox@2x.png',
      basePath: 'http://localhost:1646/spec/swagger.json',
      url: 'https://app.shapeshift.com',
    },
  }
  let sdk = await KeepKeySdk.create(config)

  if (!serviceKey) {
    window.localStorage.setItem('@app/serviceKey', config.apiKey)
  }
  return sdk
}
