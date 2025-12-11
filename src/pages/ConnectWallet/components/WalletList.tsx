import type { AvatarProps, ButtonProps } from '@chakra-ui/react'
import { Alert, AlertDescription, AlertIcon, Center, Spinner, Stack } from '@chakra-ui/react'
import { useQuery } from '@tanstack/react-query'
import type { JSX } from 'react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { useNavigate } from 'react-router-dom'

import { WalletCard } from './WalletCard'

import { MobileWalletDialogRoutes } from '@/components/MobileWalletDialog/types'
import { WalletActions } from '@/context/WalletProvider/actions'
import { KeyManager } from '@/context/WalletProvider/KeyManager'
import { useLocalWallet } from '@/context/WalletProvider/local-wallet'
import { MobileConfig } from '@/context/WalletProvider/MobileWallet/config'
import { getWallet, listWallets } from '@/context/WalletProvider/MobileWallet/mobileMessageHandlers'
import type { RevocableWallet } from '@/context/WalletProvider/MobileWallet/RevocableWallet'
import { useWallet } from '@/hooks/useWallet/useWallet'

type MobileWalletDialogProps = {
  footerComponent?: JSX.Element
  isEditing?: boolean
  buttonProps?: ButtonProps
  avatarSize?: AvatarProps['size']
  isScrollable?: boolean
  onErrorChange?: (error: string | null) => void
  onIsWaitingForRedirection?: (isWaitingForRedirection: boolean) => void
}

export const MobileWalletList: React.FC<MobileWalletDialogProps> = ({
  footerComponent,
  isEditing,
  onErrorChange,
  buttonProps,
  avatarSize = 'md',
  isScrollable = true,
  onIsWaitingForRedirection,
}) => {
  const { dispatch, getAdapter, state } = useWallet()
  const { walletInfo } = state
  const localWallet = useLocalWallet()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const translate = useTranslate()
  const [isInitializingWallet, setIsInitializingWallet] = useState<boolean>(false)

  const {
    isLoading,
    data: wallets = [],
    error: queryError,
  } = useQuery({
    queryKey: ['listWallets'],
    refetchOnMount: true,
    queryFn: async () => {
      const vaults = await listWallets()
      if (!vaults.length) {
        throw new Error('walletProvider.shapeShift.load.error.noWallet')
      }
      return vaults
    },
  })

  const handleWalletSelect = useCallback(
    async (item: RevocableWallet) => {
      setIsInitializingWallet(true)

      const adapter = await getAdapter(KeyManager.Mobile)
      const deviceId = item?.id

      if (adapter && deviceId) {
        const { name, icon } = MobileConfig

        const revoker: RevocableWallet | null = await (async () => {
          try {
            onIsWaitingForRedirection?.(true)
            const walletRevoker = await getWallet(deviceId)
            return walletRevoker
          } catch {
            return null
          }
        })()

        if (!revoker) {
          onIsWaitingForRedirection?.(false)
          setIsInitializingWallet(false)
          return
        }

        try {
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
          setError('walletProvider.shapeShift.load.error.pair')
        }
      } else {
        setError('walletProvider.shapeShift.load.error.pair')
      }

      setIsInitializingWallet(false)
    },
    [dispatch, getAdapter, localWallet, onIsWaitingForRedirection],
  )

  const handleRename = useCallback(
    (wallet: RevocableWallet) => {
      navigate(MobileWalletDialogRoutes.Rename, { state: { vault: wallet } })
    },
    [navigate],
  )

  const handleDelete = useCallback(
    (wallet: RevocableWallet) => {
      navigate(MobileWalletDialogRoutes.Delete, { state: { vault: wallet } })
    },
    [navigate],
  )

  useEffect(() => {
    if (queryError) {
      const errorMessage =
        queryError instanceof Error
          ? queryError.message
          : 'walletProvider.shapeShift.load.error.fetchingWallets'
      setError(errorMessage)
    } else {
      setError(null)
    }
  }, [queryError])

  useEffect(() => {
    onErrorChange?.(error)
  }, [error, onErrorChange])

  const content = useMemo(() => {
    return (
      <>
        {error ? (
          <Alert status='error' borderRadius='md'>
            <AlertIcon />
            <AlertDescription>{translate(error)}</AlertDescription>
          </Alert>
        ) : null}
        <Stack
          maxHeight={isScrollable ? '30vh' : 'full'}
          overflow={isScrollable ? 'auto' : 'hidden'}
        >
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
                isInitializing={isInitializingWallet && isSelected}
                isDisabled={isInitializingWallet && !isSelected}
                onRename={handleRename}
                onDelete={handleDelete}
                buttonProps={buttonProps}
                avatarSize={avatarSize}
                _hover={_hover}
                _active={_active}
              />
            )
          })}
        </Stack>
      </>
    )
  }, [
    error,
    translate,
    isScrollable,
    wallets,
    walletInfo?.deviceId,
    isEditing,
    handleWalletSelect,
    isInitializingWallet,
    handleRename,
    handleDelete,
    buttonProps,
    avatarSize,
  ])

  return isLoading || state.isLoadingLocalWallet ? (
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
