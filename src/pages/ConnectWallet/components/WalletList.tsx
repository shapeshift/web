import { Alert, AlertDescription, AlertIcon, Center, Spinner, Stack } from '@chakra-ui/react'
import { useQuery } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router'
import { MobileWalletDialogRoutes } from 'components/MobileWalletDialog/types'
import { WalletActions } from 'context/WalletProvider/actions'
import { KeyManager } from 'context/WalletProvider/KeyManager'
import { useLocalWallet } from 'context/WalletProvider/local-wallet'
import { MobileConfig } from 'context/WalletProvider/MobileWallet/config'
import { getWallet, listWallets } from 'context/WalletProvider/MobileWallet/mobileMessageHandlers'
import type { RevocableWallet } from 'context/WalletProvider/MobileWallet/RevocableWallet'
import { useWallet } from 'hooks/useWallet/useWallet'

import { WalletCard } from './WalletCard'

type MobileWalletDialogProps = {
  footerComponent?: JSX.Element
  isEditing?: boolean
  onErrorChange?: (error: string | null) => void
}

export const MobileWallestList: React.FC<MobileWalletDialogProps> = ({
  footerComponent,
  isEditing,
  onErrorChange,
}) => {
  const { dispatch, getAdapter, state } = useWallet()
  const { walletInfo } = state
  const localWallet = useLocalWallet()
  const history = useHistory()
  const [error, setError] = useState<string | null>(null)
  const translate = useTranslate()

  const { isLoading, data: wallets } = useQuery({
    queryKey: ['listWallets'],
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: true,
    queryFn: async () => {
      try {
        const vaults = await listWallets()
        if (!vaults.length) {
          setError('walletProvider.shapeShift.load.error.noWallet')
        } else {
          return vaults
        }
      } catch (e) {
        console.log(e)
        setError('walletProvider.shapeShift.load.error.fetchingWallets')
      }
    },
  })

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
            payload: { modalType: KeyManager.Mobile, isMipdProvider: false },
          })

          localWallet.setLocalWallet({ type: KeyManager.Mobile, deviceId })
          localWallet.setLocalNativeWalletName(item?.label ?? 'label')
          revoker.revoke()
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

  const handleRename = useCallback(
    (wallet: RevocableWallet) => {
      history.push(MobileWalletDialogRoutes.Rename, { vault: wallet })
    },
    [history],
  )

  const handleDelete = useCallback(
    (wallet: RevocableWallet) => {
      history.push(MobileWalletDialogRoutes.Delete, { vault: wallet })
    },
    [history],
  )

  useEffect(() => {
    onErrorChange?.(error)
  }, [error, onErrorChange])

  const content = useMemo(() => {
    if (error) {
      return (
        <Alert status='error' borderRadius='md'>
          <AlertIcon />
          <AlertDescription>{translate(error)}</AlertDescription>
        </Alert>
      )
    }
    return (
      <Stack maxHeight='30vh' overflow='auto' px={4} mx={-4}>
        {wallets?.map(wallet => {
          const isSelected = walletInfo?.deviceId === wallet.id
          const _hover = isSelected
            ? { bg: 'background.button.secondary.base', opacity: '1' }
            : undefined
          const _active = isSelected
            ? { bg: 'background.button.secondary.base', opacity: '1' }
            : undefined
          return (
            <WalletCard
              id={wallet.id}
              key={wallet.id}
              wallet={wallet}
              onClick={isSelected || isEditing ? undefined : handleWalletSelect}
              isActive={isSelected}
              isEditing={isEditing}
              onRename={handleRename}
              onDelete={handleDelete}
              _hover={_hover}
              _active={_active}
            />
          )
        })}
      </Stack>
    )
  }, [
    error,
    handleDelete,
    handleRename,
    handleWalletSelect,
    isEditing,
    translate,
    walletInfo?.deviceId,
    wallets,
  ])

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
