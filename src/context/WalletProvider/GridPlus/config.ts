import { GridPlusIcon } from '@/components/Icons/GridPlusIcon'
import type { SupportedWalletInfo } from '@/context/WalletProvider/config'

// GridPlus adapter that uses the hdwallet adapter
export class GridPlusAdapter {
  static useKeyring(keyring: any) {
    // Cache the hdwallet adapter instance to maintain state across calls
    let cachedHdWalletAdapter: any = null

    return {
      connectDevice: async (
        safecardId: string,
        physicalDeviceId: string,
        password?: string,
        existingSessionId?: string,
      ) => {
        if (!cachedHdWalletAdapter) {
          const { GridPlusAdapter: HdWalletGridPlusAdapter } = await import(
            '@shapeshiftoss/hdwallet-gridplus'
          )
          cachedHdWalletAdapter = new HdWalletGridPlusAdapter(keyring)
        }
        return await cachedHdWalletAdapter.connectDevice({
          safecardId,
          physicalDeviceId,
          password,
          existingSessionId,
        })
      },

      pairConnectedDevice: async (
        safecardId: string,
        physicalDeviceId: string,
        pairingCode: string,
      ) => {
        if (!cachedHdWalletAdapter) {
          throw new Error('Device not connected. Call connectDevice first.')
        }

        const wallet = await cachedHdWalletAdapter.pairConnectedDevice({
          safecardId,
          physicalDeviceId,
          pairingCode,
        })
        return wallet
      },

      pairDevice: async (
        safecardId: string,
        physicalDeviceId: string,
        password?: string,
        pairingCode?: string,
        existingSessionId?: string,
      ) => {
        if (!cachedHdWalletAdapter) {
          const { GridPlusAdapter: HdWalletGridPlusAdapter } = await import(
            '@shapeshiftoss/hdwallet-gridplus'
          )
          cachedHdWalletAdapter = new HdWalletGridPlusAdapter(keyring)
        }

        const wallet = await cachedHdWalletAdapter.pairDevice({
          safecardId,
          physicalDeviceId,
          password,
          pairingCode,
          existingSessionId,
        })
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
