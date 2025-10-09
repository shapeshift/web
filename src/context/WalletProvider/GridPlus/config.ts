import { GridPlusIcon } from '@/components/Icons/GridPlusIcon'
import type { SupportedWalletInfo } from '@/context/WalletProvider/config'

// GridPlus adapter that uses the hdwallet adapter
export class GridPlusAdapter {
  static useKeyring(keyring: any) {
    // Cache the hdwallet adapter instance to maintain state across calls
    let cachedHdWalletAdapter: any = null

    return {
      connectDevice: async (deviceId: string, password?: string, existingPrivKey?: string) => {
        if (!cachedHdWalletAdapter) {
          const { GridPlusAdapter: HdWalletGridPlusAdapter } = await import(
            '@shapeshiftoss/hdwallet-gridplus'
          )
          cachedHdWalletAdapter = new HdWalletGridPlusAdapter(keyring)
        }
        return await cachedHdWalletAdapter.connectDevice(deviceId, password, existingPrivKey)
      },

      pairConnectedDevice: async (deviceId: string, pairingCode: string) => {
        if (!cachedHdWalletAdapter) {
          throw new Error('Device not connected. Call connectDevice first.')
        }

        const wallet = await cachedHdWalletAdapter.pairConnectedDevice(deviceId, pairingCode)
        return wallet
      },

      // Legacy method for backward compatibility
      pairDevice: async (
        deviceId: string,
        password?: string,
        pairingCode?: string,
        existingPrivKey?: string,
      ) => {
        if (!cachedHdWalletAdapter) {
          const { GridPlusAdapter: HdWalletGridPlusAdapter } = await import(
            '@shapeshiftoss/hdwallet-gridplus'
          )
          cachedHdWalletAdapter = new HdWalletGridPlusAdapter(keyring)
        }

        const wallet = await cachedHdWalletAdapter.pairDevice(
          deviceId,
          password,
          pairingCode,
          existingPrivKey,
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
