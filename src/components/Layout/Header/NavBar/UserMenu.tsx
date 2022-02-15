import {
  ChatIcon,
  ChevronRightIcon,
  CloseIcon,
  ExternalLinkIcon,
  HamburgerIcon,
  MoonIcon,
  RepeatIcon,
  WarningTwoIcon
} from '@chakra-ui/icons'
import { Menu, MenuButton, MenuDivider, MenuGroup, MenuItem, MenuList } from '@chakra-ui/menu'
import {
  Button,
  ButtonGroup,
  Flex,
  IconButton,
  Link,
  Switch,
  useColorMode,
  useColorModeValue,
  useMediaQuery
} from '@chakra-ui/react'
import { FC, useEffect, useState } from 'react'
import { FaWallet } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'
import { MiddleEllipsis } from 'components/MiddleEllipsis/MiddleEllipsis'
import { RawText, Text } from 'components/Text'
import { InitialState, useWallet, WalletActions } from 'context/WalletProvider/WalletProvider'
import { ensReverseLookup } from 'lib/ens'
import { breakpoints } from 'theme/theme'

type WalletImageProps = Pick<InitialState, 'walletInfo'>

export const WalletImage = ({ walletInfo }: WalletImageProps) => {
  const Icon = walletInfo?.icon
  if (Icon) {
    return <Icon width='18px' height='auto' />
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
  onConnect: () => void
} & Pick<InitialState, 'walletInfo'>

const WalletButton: FC<WalletButtonProps> = ({ isConnected, walletInfo, onConnect }) => {
  const [walletLabel, setWalletLabel] = useState('')
  const [shouldShorten, setShouldShorten] = useState(true)
  const bgColor = useColorModeValue('gray.300', 'gray.800')

  useEffect(() => {
    setShouldShorten(true)
    if (!walletInfo || !walletInfo.meta) return setWalletLabel('')
    if (walletInfo.meta.address) {
      ensReverseLookup(walletInfo.meta.address).then(ens => {
        if (!ens.error) {
          setShouldShorten(false)
          return setWalletLabel(ens.name)
        }
        setWalletLabel(walletInfo?.meta?.address ?? '')
      })
      return
    }
    if (walletInfo.meta.label) {
      setShouldShorten(false)
      return setWalletLabel(walletInfo.meta.label)
    }
  }, [walletInfo])

  return Boolean(walletInfo?.deviceId) ? (
    <Button
      onClick={onConnect}
      leftIcon={<WalletImage walletInfo={walletInfo} />}
      rightIcon={isConnected ? undefined : <WarningTwoIcon ml={2} w={3} h={3} color='yellow.500' />}
    >
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
    </Button>
  ) : (
    <Button onClick={onConnect} leftIcon={<FaWallet />}>
      <Text translation='common.connectWallet' />
    </Button>
  )
}

export const UserMenu = () => {
  const [isLargerThanMd] = useMediaQuery(`(min-width: ${breakpoints['md']})`)
  const { toggleColorMode } = useColorMode()
  const isActive = useColorModeValue(false, true)
  const { state, dispatch, disconnect } = useWallet()
  const { isConnected, walletInfo } = state
  const hasWallet = Boolean(walletInfo?.deviceId)

  const handleConnect = () => {
    dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: true })
  }

  return (
    <ButtonGroup isAttached colorScheme='blue' variant='ghost-filled'>
      {isLargerThanMd && (
        <WalletButton onConnect={handleConnect} walletInfo={walletInfo} isConnected={isConnected} />
      )}
      <Menu>
        <MenuButton as={IconButton} isRound={!isLargerThanMd}>
          <HamburgerIcon />
        </MenuButton>
        <MenuList width={{ base: '100vw', md: '300px' }} maxWidth='100%' minWidth={0}>
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
          <MenuDivider />
          <MenuItem
            icon={<ChatIcon />}
            as={Link}
            isExternal
            _hover={{ textDecoration: 'none' }}
            href='https://shapeshift.notion.site/Submit-Feedback-or-a-Feature-Request-af48a25fea574da4a05a980c347c055b'
          >
            <Text translation='common.submitFeedback' />
          </MenuItem>
          <MenuItem
            icon={<ExternalLinkIcon />}
            as={Link}
            isExternal
            _hover={{ textDecoration: 'none' }}
            href='http://localhost:1646/docs'
          >
            <Text translation='common.devTools' />
          </MenuItem>
          <MenuItem
            icon={<MoonIcon />}
            closeOnSelect={false}
            justifyContent='space-between'
            onClick={toggleColorMode}
          >
            <Flex justifyContent='space-between' alignItems='center'>
              <Text translation='common.darkMode' />
              <Switch isChecked={isActive} />
            </Flex>
          </MenuItem>
        </MenuList>
      </Menu>
    </ButtonGroup>
  )
}
