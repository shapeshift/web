import { ChevronDownIcon, CloseIcon, RepeatIcon } from '@chakra-ui/icons'
import { Menu, MenuButton, MenuDivider, MenuGroup, MenuItem, MenuList } from '@chakra-ui/menu'
import { Button, Flex, Image } from '@chakra-ui/react'
import { FC } from 'react'
import { useTranslate } from 'react-polyglot'
import { WalletConnectIcon } from 'components/Icons/WalletConnect'
// import { WalletConnectIcon } from 'components/Icons/WalletConnect'
import { RawText, Text } from 'components/Text'
import { useModal } from 'context/ModalProvider/ModalProvider'
import { InitialState, useWallet, WalletActions } from 'context/WalletProvider/WalletProvider'

const NoApp = ({ onClick }: { onClick: () => void }) => {
  const translate = useTranslate()
  return (
    <MenuGroup title={translate('common.noApp')} ml={3} color='gray.500'>
      <MenuItem onClick={onClick} alignItems='center' justifyContent='space-between'>
        {translate('common.connectApp')}
      </MenuItem>
    </MenuGroup>
  )
}

type WalletConnectedProps = {
  onDisconnect: () => void
  onSwitchProvider: () => void
  isConnected: boolean
} & Pick<InitialState, 'walletConnectApp'>

const AppConnected = ({
  walletConnectApp,
  isConnected,
  onDisconnect,
  onSwitchProvider
}: WalletConnectedProps) => {
  const translate = useTranslate()
  console.info(walletConnectApp)
  return (
    <MenuGroup title={translate('common.connectedApp')} ml={3} color='gray.500'>
      <MenuItem icon={<Image width='6' src={walletConnectApp?.icons[0]} />}>
        <Flex flexDir='row' justifyContent='space-between' alignItems='center'>
          <RawText>{walletConnectApp?.name}</RawText>
          {!isConnected && (
            <Text
              translation={'walletConnect.menu.disconnected'}
              fontSize='sm'
              color='yellow.500'
            />
          )}
        </Flex>
      </MenuItem>
      <MenuDivider ml={3} />
      <MenuItem icon={<RepeatIcon />} onClick={onSwitchProvider}>
        {translate('walletConnect.menu.switchApp')}
      </MenuItem>
      <MenuItem fontWeight='medium' icon={<CloseIcon />} onClick={onDisconnect} color='red.500'>
        {translate('walletConnect.menu.disconnect')}
      </MenuItem>
    </MenuGroup>
  )
}

type WalletButtonProps = {
  isConnected: boolean
  onConnect: () => void
} & Pick<InitialState, 'walletConnectApp'>

const WalletButton: FC<WalletButtonProps> = ({ walletConnectApp, onConnect }) => {
  return !!walletConnectApp ? (
    <MenuButton
      as={Button}
      width={{ base: '100%', lg: 'auto' }}
      leftIcon={<WalletConnectIcon mt={2} width='6' />}
      rightIcon={<ChevronDownIcon />}
    >
      <Flex>
        <Text translation={'common.walletConnect'} />
      </Flex>
    </MenuButton>
  ) : (
    <Button onClick={onConnect} leftIcon={<WalletConnectIcon mt={2} width='6' />}>
      <Text translation='common.connectApp' />
    </Button>
  )
}

export const WalletConnectMenu = () => {
  const { state, dispatch } = useWallet()
  const { walletConnect } = useModal()
  const { walletConnectApp } = state
  const hasWallet = !!walletConnectApp

  const handleWalletConnect = () => {
    console.info('OPEN WALLET CONNECT')
    walletConnect.open({})
  }

  return (
    <Menu>
      <WalletButton
        onConnect={handleWalletConnect}
        isConnected={hasWallet}
        walletConnectApp={walletConnectApp}
      />
      <MenuList maxWidth='100%' minWidth={0}>
        {hasWallet ? (
          <AppConnected
            isConnected={hasWallet}
            walletConnectApp={walletConnectApp}
            onDisconnect={() => {
              dispatch({ type: WalletActions.SET_WALLET_CONNECT_APP, payload: null })
            }}
            onSwitchProvider={handleWalletConnect}
          />
        ) : (
          <NoApp onClick={handleWalletConnect} />
        )}
      </MenuList>
    </Menu>
  )
}
