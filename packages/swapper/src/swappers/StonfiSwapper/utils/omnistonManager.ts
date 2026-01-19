import { Omniston } from '@ston-fi/omniston-sdk'

import { STONFI_WEBSOCKET_URL } from './constants'

let cachedOmniston: Omniston | null = null

export const omnistonManager = {
  getInstance: (): Omniston => {
    if (!cachedOmniston) {
      cachedOmniston = new Omniston({ apiUrl: STONFI_WEBSOCKET_URL })
    }
    return cachedOmniston
  },

  disconnect: (): void => {
    if (cachedOmniston) {
      cachedOmniston.close()
      cachedOmniston = null
    }
  },
}
