import { Alert, AlertDescription, AlertIcon, Center, Spinner, Stack } from '@chakra-ui/react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { WalletActions } from 'context/WalletProvider/actions'
import { KeyManager } from 'context/WalletProvider/KeyManager'
import { useLocalWallet } from 'context/WalletProvider/local-wallet'
import { MobileConfig } from 'context/WalletProvider/MobileWallet/config'
import { getWallet, listWallets } from 'context/WalletProvider/MobileWallet/mobileMessageHandlers'
import type { RevocableWallet } from 'context/WalletProvider/MobileWallet/RevocableWallet'
import { useWallet } from 'hooks/useWallet/useWallet'

import { WalletCard } from './WalletCard'

export type WalletInfo = {
  id?: string
  name?: string
  createdAt?: number
}

type MobileWalletDialogProps = {
  footerComponent?: JSX.Element
}

export const MobileWalletList: React.FC<MobileWalletDialogProps> = ({ footerComponent }) => {
  const { dispatch, getAdapter, state } = useWallet()
  const { walletInfo } = state
  const localWallet = useLocalWallet()
  const [wallets, setWallets] = useState<RevocableWallet[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!wallets.length) {
      setIsLoading(true) // Set loading state to true when fetching wallets
      ;(async () => {
        try {
          const vaults = await listWallets()
          if (!vaults.length) {
            setError('walletProvider.shapeShift.load.error.noWallet')
          } else {
            setWallets(vaults)
          }
        } catch (e) {
          console.log(e)
          setError('An error occurred while fetching wallets.')
        } finally {
          setIsLoading(false) // Set loading state to false when fetching is done
        }
      })()
    }
  }, [wallets])

  const handleWalletSelect = useCallback(
    async (item: RevocableWallet) => {
      const adapter = await getAdapter(KeyManager.Mobile)
      const deviceId = item?.id
      if (adapter && deviceId) {
        const { name, icon } = MobileConfig
        try {
          const revoker = await getWallet(deviceId)
          if (!revoker?.mnemonic) throw new Error(`Mobile wallet not found: ${deviceId}`)
          if (!revoker?.id) throw new Error(`Revoker ID not found: ${deviceId}`)

          const wallet = await adapter.pairDevice(revoker.id)
          await wallet?.loadDevice({ mnemonic: revoker.mnemonic })
          if (!(await wallet?.isInitialized())) {
            await wallet?.initialize()
          }
          dispatch({
            type: WalletActions.SET_WALLET,
            payload: {
              wallet,
              name,
              icon,
              deviceId,
              meta: { label: item.label },
              connectedType: KeyManager.Mobile,
            },
          })
          dispatch({ type: WalletActions.SET_IS_CONNECTED, payload: true })
          dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: false })
          dispatch({
            type: WalletActions.SET_CONNECTOR_TYPE,
            payload: KeyManager.Mobile,
          })

          localWallet.setLocalWalletTypeAndDeviceId(KeyManager.Mobile, deviceId)
          localWallet.setLocalNativeWalletName(item?.label ?? 'label')
        } catch (e) {
          console.log(e)
          setError('walletProvider.shapeShift.load.error.pair')
        }
      } else {
        setError('walletProvider.shapeShift.load.error.pair')
      }
    },
    [dispatch, getAdapter, localWallet],
  )

  const content = useMemo(() => {
    if (error) {
      return (
        <Alert status='error' borderRadius='md'>
          <AlertIcon />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )
    }
    return (
      <Stack>
        {wallets.map(wallet => (
          <WalletCard
            id={wallet.id}
            key={wallet.id}
            wallet={wallet}
            onClick={handleWalletSelect}
            isActive={walletInfo?.deviceId === wallet.id}
          />
        ))}
      </Stack>
    )
  }, [error, handleWalletSelect, walletInfo?.deviceId, wallets])

  return isLoading ? (
    <Center py={6}>
      <Spinner />
    </Center>
  ) : (
    <Stack>
      {content}
      {footerComponent}
    </Stack>
  )
}
