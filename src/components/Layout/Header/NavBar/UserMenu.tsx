import {
  ChevronDownIcon,
  ChevronRightIcon,
  CloseIcon,
  ExternalLinkIcon,
  RepeatIcon,
  SettingsIcon,
  WarningTwoIcon
} from '@chakra-ui/icons'
import { Menu, MenuButton, MenuDivider, MenuGroup, MenuItem, MenuList } from '@chakra-ui/menu'
import { Button, Flex, HStack, Link, useColorModeValue } from '@chakra-ui/react'
import { FC, useEffect, useState } from 'react'
import { FaPuzzlePiece, FaWallet } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'
import { WalletConnectIcon } from 'components/Icons/WalletConnect'
// import { WalletConnectIcon } from 'components/Icons/WalletConnect'
import { MiddleEllipsis } from 'components/MiddleEllipsis/MiddleEllipsis'
import { RawText, Text } from 'components/Text'
import { useModal } from 'context/ModalProvider/ModalProvider'
import { InitialState, useWallet, WalletActions } from 'context/WalletProvider/WalletProvider'
import { ensReverseLookup } from 'lib/ens'

type WalletImageProps = Pick<InitialState, 'walletInfo'>

export const WalletImage = ({ walletInfo }: WalletImageProps) => {
  const Icon = walletInfo?.icon
  if (Icon) {
    return <Icon width='6' height='auto' />
  }
  return null
}

const NoWallet = ({ onClick }: { onClick: () => void }) => {
  const translate = useTranslate()
  return (
    <MenuGroup title={translate('common.noWallet')} ml={3} color='gray.500'>
      <MenuItem onClick={onClick} alignItems='center' justifyContent='space-between'>
        {translate('common.connectWallet')}
        <ChevronRightIcon />
      </MenuItem>
    </MenuGroup>
  )
}

type WalletConnectedProps = {
  onDisconnect: () => void
  onSwitchProvider: () => void
} & Pick<InitialState, 'walletInfo' | 'isConnected'>

const WalletConnected = ({
  walletInfo,
  isConnected,
  onDisconnect,
  onSwitchProvider
}: WalletConnectedProps) => {
  const translate = useTranslate()
  return (
    <MenuGroup title={translate('common.connectedWallet')} ml={3} color='gray.500'>
      <MenuItem icon={<WalletImage walletInfo={walletInfo} />}>
        <Flex flexDir='row' justifyContent='space-between' alignItems='center'>
          <RawText>{walletInfo?.name}</RawText>
          {!isConnected && (
            <Text
              translation={'connectWallet.menu.disconnected'}
              fontSize='sm'
              color='yellow.500'
            />
          )}
        </Flex>
      </MenuItem>
      <MenuDivider ml={3} />
      <MenuItem icon={<RepeatIcon />} onClick={onSwitchProvider}>
        {translate('connectWallet.menu.switchWallet')}
      </MenuItem>
      <MenuItem fontWeight='medium' icon={<CloseIcon />} onClick={onDisconnect} color='red.500'>
        {translate('connectWallet.menu.disconnect')}
      </MenuItem>
    </MenuGroup>
  )
}

type WalletButtonProps = {
  isConnected: boolean
  isLoadingLocalWallet: boolean
  onConnect: () => void
} & Pick<InitialState, 'walletInfo'>

const WalletButton: FC<WalletButtonProps> = ({
  isConnected,
  walletInfo,
  onConnect,
  isLoadingLocalWallet
}) => {
  const [walletLabel, setWalletLabel] = useState('')
  const [shouldShorten, setShouldShorten] = useState(true)
  const bgColor = useColorModeValue('gray.300', 'gray.800')

  useEffect(() => {
    ;(async () => {
      setShouldShorten(true)
      if (!walletInfo || !walletInfo.meta) return setWalletLabel('')
      if (walletInfo.meta.address) {
        try {
          const addressReverseLookup = await ensReverseLookup(walletInfo.meta.address)
          if (!addressReverseLookup.error) {
            setShouldShorten(false)
            return setWalletLabel(addressReverseLookup.name)
          }
          return setWalletLabel(walletInfo?.meta?.address ?? '')
        } catch (_) {
          return setWalletLabel(walletInfo?.meta?.address ?? '')
        }
      }
      if (walletInfo.meta.label) {
        setShouldShorten(false)
        return setWalletLabel(walletInfo.meta.label)
      }
    })()
  }, [walletInfo])

  return Boolean(walletInfo?.deviceId) || isLoadingLocalWallet ? (
    <MenuButton
      as={Button}
      width={{ base: '100%', lg: 'auto' }}
      isLoading={isLoadingLocalWallet}
      leftIcon={
        <HStack>
          {isConnected ? undefined : <WarningTwoIcon ml={2} w={3} h={3} color='yellow.500' />}
          <WalletImage walletInfo={walletInfo} />
        </HStack>
      }
      rightIcon={<ChevronDownIcon />}
    >
      <Flex>
        {walletLabel ? (
          <MiddleEllipsis
            rounded='lg'
            fontSize='sm'
            p='1'
            pl='2'
            pr='2'
            shouldShorten={shouldShorten}
            bgColor={bgColor}
            address={walletLabel}
          />
        ) : (
          <RawText>{walletInfo?.name}</RawText>
        )}
      </Flex>
    </MenuButton>
  ) : (
    <Button onClick={onConnect} leftIcon={<FaWallet />}>
      <Text translation='common.connectWallet' />
    </Button>
  )
}

export const UserMenu = () => {
  const { state, dispatch, disconnect } = useWallet()
  const { walletConnect, pairedApps, appSettings } = useModal()
  const { isConnected, walletInfo } = state
  const hasWallet = Boolean(walletInfo?.deviceId)

  const handleConnect = () => {
    dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: true })
  }

  const handleWalletConnect = () => {
    console.info('OPEN WALLET CONNECT')
    walletConnect.open({})
  }

  const handleAppSettings = () => {
    console.info('OPEN APP SETTINGS')
    appSettings.open({})
  }

  return (
    <Menu>
      <WalletButton
        onConnect={handleConnect}
        walletInfo={walletInfo}
        isConnected={isConnected}
        isLoadingLocalWallet={state.isLoadingLocalWallet}
      />
      <MenuList maxWidth='100%' minWidth={0}>
        {hasWallet ? (
          <WalletConnected
            isConnected={isConnected}
            walletInfo={walletInfo}
            onDisconnect={disconnect}
            onSwitchProvider={handleConnect}
          />
        ) : (
          <NoWallet onClick={handleConnect} />
        )}
        <MenuItem icon={<WalletConnectIcon />} onClick={handleWalletConnect}>
          <Text translation='common.walletConnect' />
        </MenuItem>
        <MenuItem icon={<SettingsIcon />} onClick={handleAppSettings}>
          <Text translation='common.appSettings' />
        </MenuItem>
        <MenuItem icon={<FaPuzzlePiece />} onClick={() => pairedApps.open({})}>
          <Text translation='common.pairedApps' />
        </MenuItem>
        <MenuItem
          icon={<ExternalLinkIcon />}
          as={Link}
          isExternal
          _hover={{ textDecoration: 'none', outline: 'none' }}
          href='http://localhost:1646/docs'
        >
          <Text translation='common.devTools' />
        </MenuItem>
      </MenuList>
    </Menu>
  )
}
