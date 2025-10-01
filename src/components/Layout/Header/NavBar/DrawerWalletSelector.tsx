import { CheckCircleIcon, ChevronDownIcon } from '@chakra-ui/icons'
import {
  Box,
  Button,
  Divider,
  Flex,
  Image,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Skeleton,
  Stack,
  Text,
  useColorModeValue,
} from '@chakra-ui/react'
import type { FC } from 'react'
import { memo, useCallback } from 'react'
import { FaPlus } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'

import { WalletActions } from '@/context/WalletProvider/actions'
import { KeyManager } from '@/context/WalletProvider/KeyManager'
import { NativeWalletRoutes } from '@/context/WalletProvider/types'
import type { InitialState } from '@/context/WalletProvider/WalletProvider'
import { useConnectedWalletsList } from '@/hooks/useConnectedWalletsList/useConnectedWalletsList'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { ProfileAvatar } from '@/pages/Dashboard/components/ProfileAvatar/ProfileAvatar'

const chevronDownIcon = <ChevronDownIcon />
const plusIcon = <FaPlus />

const menuButtonHoverSx = { borderColor: 'border.hover' }

type DrawerWalletSelectorProps = {
  walletInfo: InitialState['walletInfo']
  label: string | undefined
  onSwitchProvider: () => void
}

export const DrawerWalletSelector: FC<DrawerWalletSelectorProps> = memo(({ walletInfo, label }) => {
  const translate = useTranslate()
  const { wallets, isLoading } = useConnectedWalletsList()
  const { connect, dispatch } = useWallet()
  const greenColor = useColorModeValue('green.500', 'green.200')

  const handleWalletClick = useCallback(
    (wallet: { keyManager?: string; isMipdProvider: boolean; id: string; deviceId?: string }) => {
      if (!wallet.keyManager) return

      // Native wallets need special handling to pre-select the specific wallet
      if (wallet.keyManager === KeyManager.Native && wallet.deviceId) {
        dispatch({
          type: WalletActions.SET_NATIVE_PENDING_DEVICE_ID,
          payload: wallet.deviceId,
        })
        dispatch({
          type: WalletActions.SET_CONNECTOR_TYPE,
          payload: { modalType: KeyManager.Native, isMipdProvider: false },
        })
        dispatch({
          type: WalletActions.SET_INITIAL_ROUTE,
          payload: NativeWalletRoutes.EnterPassword,
        })
        dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: true })
      } else {
        // MIPD and other wallets use the standard connect flow
        connect(wallet.keyManager, wallet.isMipdProvider)
        dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: true })
      }
    },
    [connect, dispatch],
  )

  const handleConnectNewWallet = useCallback(() => {
    dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: true })
  }, [dispatch])

  const renderWalletIcon = useCallback((iconProp: string | React.ComponentType) => {
    if (typeof iconProp === 'string') {
      return <Image src={iconProp} boxSize='20px' borderRadius='sm' />
    }
    const IconComponent = iconProp
    return <Box as={IconComponent} width='20px' height='20px' />
  }, [])

  if (!walletInfo || !label) return null

  return (
    <Menu isLazy>
      <MenuButton
        as={Button}
        rightIcon={chevronDownIcon}
        variant='ghost'
        border='1px solid'
        borderColor='border.base'
        borderRadius='xl'
        size='md'
        _hover={menuButtonHoverSx}
        px={3}
        py={2}
      >
        <Flex align='center' gap={2}>
          <ProfileAvatar size='sm' borderRadius='full' />
          <Text fontWeight='medium'>{label}</Text>
        </Flex>
      </MenuButton>
      <MenuList zIndex='popover' minW='240px'>
        {isLoading ? (
          <Box px={3} py={2}>
            <Stack spacing={2}>
              <Skeleton height='32px' />
              <Skeleton height='32px' />
            </Stack>
          </Box>
        ) : (
          <>
            {/* eslint-disable react-memo/require-usememo */}
            {wallets.map(wallet => {
              const handleClick = () =>
                handleWalletClick({
                  keyManager: wallet.keyManager,
                  isMipdProvider: wallet.isMipdProvider,
                  id: wallet.id,
                  deviceId: wallet.deviceId,
                })
              const iconElement = renderWalletIcon(wallet.icon)
              return (
                <MenuItem key={wallet.id} onClick={handleClick} icon={iconElement}>
                  <Flex justify='space-between' align='center' flex='1'>
                    <Text fontSize='sm' fontWeight='medium'>
                      {wallet.name}
                    </Text>
                    {wallet.isCurrentWallet && <CheckCircleIcon color={greenColor} />}
                  </Flex>
                </MenuItem>
              )
            })}
            {/* eslint-enable react-memo/require-usememo */}
            {wallets.length > 0 && <Divider />}
            <MenuItem icon={plusIcon} onClick={handleConnectNewWallet}>
              <Text fontSize='sm'>
                {translate('walletProvider.shapeShift.onboarding.addNewWallet')}
              </Text>
            </MenuItem>
          </>
        )}
      </MenuList>
    </Menu>
  )
})
