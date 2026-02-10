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
import { FiArrowLeft } from 'react-icons/fi'
import { TbDots, TbEdit, TbEyeOff, TbHistory, TbSettings } from 'react-icons/tb'
import { useTranslate } from 'react-polyglot'
import { useNavigate } from 'react-router-dom'

import { WalletImage } from './WalletImage'

import { QRCodeIcon } from '@/components/Icons/QRCode'
import { SUPPORTED_WALLETS } from '@/context/WalletProvider/config'
import type { InitialState } from '@/context/WalletProvider/WalletProvider'
import { useNewConversation } from '@/features/agenticChat/hooks/useNewConversation'
import { useModal } from '@/hooks/useModal/useModal'
import { useMipdProviders } from '@/lib/mipd'
import { ProfileAvatar } from '@/pages/Dashboard/components/ProfileAvatar/ProfileAvatar'
import { agenticChatSlice } from '@/state/slices/agenticChatSlice/agenticChatSlice'
import { gridplusSlice } from '@/state/slices/gridplusSlice/gridplusSlice'
import { selectWalletRdns } from '@/state/slices/localWalletSlice/selectors'
import { useAppDispatch, useAppSelector } from '@/state/store'

const settingsIcon = <TbSettings />
const dotsIcon = <Icon as={TbDots} />
const eyeOffIcon = <Icon as={TbEyeOff} />
const qrCodeIcon = <QRCodeIcon />
const historyIcon = <TbHistory />
const newChatIcon = <TbEdit />

type DrawerHeaderProps = {
  walletInfo: InitialState['walletInfo']
  isConnected: boolean
  isLocked: boolean
  connectedType: InitialState['connectedType']
  onDisconnect: () => void
  onSwitchProvider: () => void
  onClose?: () => void
  onSettingsClick?: () => void
  isChatOpen?: boolean
  onBackFromChat?: () => void
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
    isChatOpen,
    onBackFromChat,
  }) => {
    const translate = useTranslate()
    const dispatch = useAppDispatch()
    const settings = useModal('settings')
    const qrCode = useModal('qrCode')
    const navigate = useNavigate()
    const isChatHistoryOpen = useAppSelector(agenticChatSlice.selectors.selectIsChatHistoryOpen)

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

    const handleQrCodeClick = useCallback(() => {
      qrCode.open({})
    }, [qrCode])

    const handleChatHistoryClick = useCallback(() => {
      dispatch(agenticChatSlice.actions.openChatHistory())
    }, [dispatch])

    const handleNewChatClick = useNewConversation()

    const handleBackClick = useCallback(() => {
      if (isChatHistoryOpen) {
        dispatch(agenticChatSlice.actions.closeChatHistory())
      } else {
        onBackFromChat?.()
      }
    }, [isChatHistoryOpen, dispatch, onBackFromChat])

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
      <Flex align='center' px={4} pt={4} pb={isChatOpen ? 4 : 0} justify='space-between'>
        <Flex align='center' gap={2}>
          {isChatOpen && onBackFromChat && (
            <IconButton
              icon={<FiArrowLeft />}
              aria-label={translate('common.back')}
              onClick={handleBackClick}
              variant='ghost'
              size='sm'
            />
          )}
          <ProfileAvatar size='md' borderRadius='full' />
          <Text fontWeight='medium'>{label}</Text>
        </Flex>
        <Flex gap={2}>
          {isChatOpen ? (
            <>
              <IconButton
                aria-label={translate('agenticChat.newChat')}
                isRound
                fontSize='lg'
                icon={newChatIcon}
                size='md'
                onClick={handleNewChatClick}
              />
              <IconButton
                aria-label={translate('agenticChat.chatHistory')}
                isRound
                fontSize='lg'
                icon={historyIcon}
                size='md'
                onClick={handleChatHistoryClick}
              />
            </>
          ) : (
            <IconButton
              aria-label={translate('modals.send.qrCode')}
              isRound
              fontSize='lg'
              icon={qrCodeIcon}
              size='md'
              onClick={handleQrCodeClick}
            />
          )}
          <IconButton
            aria-label={translate('common.settings')}
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
