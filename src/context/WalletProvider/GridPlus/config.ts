import { GridPlusAdapter as HdWalletGridPlusAdapter } from '@shapeshiftoss/hdwallet-gridplus'

import { GridPlusIcon } from '@/components/Icons/GridPlusIcon'
import type { SupportedWalletInfo } from '@/context/WalletProvider/config'

export class GridPlusAdapter {
  static useKeyring(keyring: any) {
    // Cache the hdwallet adapter instance to maintain state across calls
    let cachedHdWalletAdapter: any = null

    return {
      connectDevice: async (
        _safecardId: string,
        physicalDeviceId: string,
        password?: string,
        existingSessionId?: string,
      ) => {
        if (!cachedHdWalletAdapter) {
          cachedHdWalletAdapter = new HdWalletGridPlusAdapter(keyring)
        }
        return await cachedHdWalletAdapter.connectDevice(
          physicalDeviceId,
          password,
          existingSessionId,
        )
      },

      pairConnectedDevice: async (
        _safecardId: string,
        physicalDeviceId: string,
        pairingCode: string,
      ) => {
        if (!cachedHdWalletAdapter) {
          throw new Error('Device not connected. Call connectDevice first.')
        }

        const wallet = await cachedHdWalletAdapter.pairConnectedDevice(
          physicalDeviceId,
          pairingCode,
        )
        return wallet
      },

      pairDevice: async (
        _safecardId: string,
        physicalDeviceId: string,
        password?: string,
        pairingCode?: string,
        existingSessionId?: string,
      ) => {
        if (!cachedHdWalletAdapter) {
          cachedHdWalletAdapter = new HdWalletGridPlusAdapter(keyring)
        }

        const wallet = await cachedHdWalletAdapter.pairDevice(
          physicalDeviceId,
          password,
          pairingCode,
          existingSessionId,
        )
        return wallet
      },
    }
  }
}

type GridPlusConfigType = Omit<SupportedWalletInfo<typeof GridPlusAdapter>, 'routes'>

export const GridPlusConfig: GridPlusConfigType = {
  adapters: [
    {
      loadAdapter: () => Promise.resolve(GridPlusAdapter),
    },
  ],
  icon: GridPlusIcon,
  name: 'GridPlus',
}
