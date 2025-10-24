import { CloseIcon, RepeatIcon } from '@chakra-ui/icons'
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
import { TbDots, TbEyeOff, TbSettings } from 'react-icons/tb'
import { useTranslate } from 'react-polyglot'
import { useNavigate } from 'react-router-dom'

import { WalletImage } from './WalletImage'

import { SUPPORTED_WALLETS } from '@/context/WalletProvider/config'
import type { InitialState } from '@/context/WalletProvider/WalletProvider'
import { useModal } from '@/hooks/useModal/useModal'
import { useMipdProviders } from '@/lib/mipd'
import { ProfileAvatar } from '@/pages/Dashboard/components/ProfileAvatar/ProfileAvatar'
import { gridplusSlice } from '@/state/slices/gridplusSlice/gridplusSlice'
import { selectWalletRdns } from '@/state/slices/localWalletSlice/selectors'
import { useAppSelector } from '@/state/store'

const settingsIcon = <TbSettings />
const dotsIcon = <Icon as={TbDots} />
const eyeOffIcon = <Icon as={TbEyeOff} />

type DrawerHeaderProps = {
  walletInfo: InitialState['walletInfo']
  isConnected: boolean
  isLocked: boolean
  connectedType: InitialState['connectedType']
  onDisconnect: () => void
  onSwitchProvider: () => void
  onClose?: () => void
  onSettingsClick?: () => void
}

export const DrawerWalletHeader: FC<DrawerHeaderProps> = memo(
  ({
    walletInfo,
    isConnected,
    isLocked,
    connectedType,
    onDisconnect,
    onSwitchProvider,
    onSettingsClick,
  }) => {
    const translate = useTranslate()
    const settings = useModal('settings')
    const navigate = useNavigate()

    const maybeRdns = useAppSelector(selectWalletRdns)
    const activeSafeCard = useAppSelector(gridplusSlice.selectors.selectActiveSafeCard)
    const mipdProviders = useMipdProviders()
    const maybeMipdProvider = useMemo(
      () => mipdProviders.find(provider => provider.info.rdns === maybeRdns),
      [mipdProviders, maybeRdns],
    )

    const label = useMemo(() => {
      const baseName = maybeMipdProvider?.info?.name || walletInfo?.meta?.label || walletInfo?.name
      // For GridPlus wallets, show "GridPlus - <SafeCardName>"
      if (baseName === 'GridPlus' && activeSafeCard) {
        return `GridPlus - ${activeSafeCard.name}`
      }
      return baseName
    }, [walletInfo, maybeMipdProvider?.info?.name, activeSafeCard])

    const handleSettingsClick = useCallback(() => {
      if (onSettingsClick) return onSettingsClick()

      settings.open({})
    }, [settings, onSettingsClick])

    const handleManageHiddenAssetsClick = useCallback(() => {
      navigate('/manage-hidden-assets')
    }, [navigate])

    const repeatIcon = useMemo(() => <RepeatIcon />, [])
    const closeIcon = useMemo(() => <CloseIcon />, [])

    const ConnectMenuComponent = useMemo(
      () => connectedType && SUPPORTED_WALLETS[connectedType]?.connectedMenuComponent,
      [connectedType],
    )

    const walletImageIcon = useMemo(
      () => <WalletImage walletInfo={maybeMipdProvider?.info ?? walletInfo} />,
      [walletInfo, maybeMipdProvider?.info],
    )

    if (!isConnected || isLocked || !walletInfo) return null

    return (
      <Flex align='center' px={4} pt={4} justify='space-between'>
        <Flex align='center' gap={2}>
          <ProfileAvatar size='md' borderRadius='full' />
          <Text fontWeight='medium'>{label}</Text>
        </Flex>
        <Flex gap={2}>
          <IconButton
            aria-label='Settings'
            isRound
            fontSize='lg'
            icon={settingsIcon}
            size='md'
            onClick={handleSettingsClick}
          />
          <Menu>
            <MenuButton
              as={IconButton}
              isRound
              fontSize='lg'
              aria-label='Menu'
              icon={dotsIcon}
              size='md'
            />
            <MenuList zIndex={'popover'}>
              <MenuGroup title={translate('common.connectedWallet')} color='text.subtle'>
                <MenuItem icon={walletImageIcon} isDisabled closeOnSelect={false}>
                  <Flex flexDir='row' justifyContent='space-between' alignItems='center'>
                    <Text>{label}</Text>
                  </Flex>
                </MenuItem>
              </MenuGroup>
              <MenuDivider />
              <MenuGroup title={translate('common.walletActions')} color='text.subtle'>
                {ConnectMenuComponent && <ConnectMenuComponent />}
                <MenuDivider />
                <MenuItem icon={eyeOffIcon} onClick={handleManageHiddenAssetsClick}>
                  {translate('manageHiddenAssets.title')}
                </MenuItem>
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
