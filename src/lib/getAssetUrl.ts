import { ipcRenderer } from 'electron'
import { uniqueId } from 'lodash'

export const getAssetUrl = (assetPath: string) =>
  new Promise<string>((resolve, _reject) => {
    const nonce = uniqueId()

    ipcRenderer.send('@app/get-asset-url', { nonce, assetPath })
    ipcRenderer.once(`@app/get-asset-url-${nonce}`, (_event, data) => {
      if (data.nonce === nonce) {
        resolve(data.assetUrl)
      }
    })
  })
