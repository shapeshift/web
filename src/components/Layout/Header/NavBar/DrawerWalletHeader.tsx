import { CloseIcon, RepeatIcon, SettingsIcon } from '@chakra-ui/icons'
import {
  Flex,
  Icon,
  IconButton,
  Menu,
  MenuButton,
  MenuDivider,
  MenuGroup,
  MenuItem,
  MenuList,
  Text,
} from '@chakra-ui/react'
import type { FC } from 'react'
import { memo, useCallback, useMemo } from 'react'
import { TbDots } from 'react-icons/tb'
import { useTranslate } from 'react-polyglot'

import { WalletImage } from './WalletImage'

import { SUPPORTED_WALLETS } from '@/context/WalletProvider/config'
import type { InitialState } from '@/context/WalletProvider/WalletProvider'
import { useModal } from '@/hooks/useModal/useModal'
import { useMipdProviders } from '@/lib/mipd'
import { ProfileAvatar } from '@/pages/Dashboard/components/ProfileAvatar/ProfileAvatar'
import { selectWalletRdns } from '@/state/slices/localWalletSlice/selectors'
import { useAppSelector } from '@/state/store'

const settingsIcon = <SettingsIcon />
const dotsIcon = <Icon as={TbDots} />

type DrawerHeaderProps = {
  walletInfo: InitialState['walletInfo']
  isConnected: boolean
  connectedType: InitialState['connectedType']
  onDisconnect: () => void
  onSwitchProvider: () => void
  onClose?: () => void
  onSettingsClick?: () => void
}

export const DrawerWalletHeader: FC<DrawerHeaderProps> = memo(
  ({ walletInfo, isConnected, connectedType, onDisconnect, onSwitchProvider, onSettingsClick }) => {
    const translate = useTranslate()
    const settings = useModal('settings')

    const maybeRdns = useAppSelector(selectWalletRdns)
    const mipdProviders = useMipdProviders()
    const maybeMipdProvider = useMemo(
      () => mipdProviders.find(provider => provider.info.rdns === maybeRdns),
      [mipdProviders, maybeRdns],
    )

    const label = useMemo(
      () => maybeMipdProvider?.info?.name || walletInfo?.meta?.label || walletInfo?.name,
      [walletInfo, maybeMipdProvider?.info?.name],
    )

    const handleSettingsClick = useCallback(() => {
      onSettingsClick?.() ?? settings.open({})
    }, [settings, onSettingsClick])

    const repeatIcon = useMemo(() => <RepeatIcon />, [])
    const closeIcon = useMemo(() => <CloseIcon />, [])

    const ConnectMenuComponent = useMemo(
      () => connectedType && SUPPORTED_WALLETS[connectedType]?.connectedMenuComponent,
      [connectedType],
    )

    const walletImageIcon = useMemo(() => <WalletImage walletInfo={walletInfo} />, [walletInfo])

    if (!isConnected || !walletInfo) return null

    return (
      <Flex align='center' justify='space-between'>
        <Flex align='center' gap={2}>
          <ProfileAvatar size='sm' borderRadius='full' />
          <Text fontWeight='medium'>{label}</Text>
        </Flex>
        <Flex gap={2}>
          <IconButton
            aria-label='Settings'
            rounded='full'
            icon={settingsIcon}
            size='sm'
            onClick={handleSettingsClick}
          />
          <Menu>
            <MenuButton
              as={IconButton}
              rounded='full'
              aria-label='Menu'
              icon={dotsIcon}
              size='sm'
            />
            <MenuList zIndex={2}>
              <MenuGroup title={translate('common.connectedWallet')} color='text.subtle'>
                <MenuItem icon={walletImageIcon} isDisabled closeOnSelect={false}>
                  <Flex flexDir='row' justifyContent='space-between' alignItems='center'>
                    <Text>{walletInfo?.name}</Text>
                  </Flex>
                </MenuItem>
              </MenuGroup>
              <MenuDivider />
              <MenuGroup title={translate('common.walletActions')} color='text.subtle'>
                {ConnectMenuComponent && <ConnectMenuComponent />}
                <MenuDivider />
                <MenuItem icon={repeatIcon} onClick={onSwitchProvider}>
                  {translate('connectWallet.menu.switchWallet')}
                </MenuItem>
                <MenuItem
                  fontWeight='medium'
                  icon={closeIcon}
                  onClick={onDisconnect}
                  color='red.500'
                >
                  {translate('connectWallet.menu.disconnect')}
                </MenuItem>
              </MenuGroup>
            </MenuList>
          </Menu>
        </Flex>
      </Flex>
    )
  },
)
