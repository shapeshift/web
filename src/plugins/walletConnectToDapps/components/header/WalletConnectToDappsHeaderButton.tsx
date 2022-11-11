import { ChevronDownIcon, ChevronRightIcon } from '@chakra-ui/icons'
import { Menu, MenuButton, MenuList } from '@chakra-ui/menu'
import { Button } from '@chakra-ui/react'
import { useWalletConnect } from 'plugins/walletConnectToDapps/WalletConnectBridgeContext'
import { useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { WalletConnectIcon } from 'components/Icons/WalletConnectIcon'
import { RawText } from 'components/Text'

import { ConnectModal } from '../modal/connectModal'
import { DappAvatar } from './DappAvatar'
import { DappHeaderMenuSummary } from './DappHeaderMenuSummary'

export const WalletConnectToDappsHeaderButton = () => {
  const [isOpen, setOpen] = useState(false)
  const translate = useTranslate()
  const walletConnect = useWalletConnect()

  if (!walletConnect?.bridge?.connector.connected || !walletConnect || !walletConnect.dapp) {
    return (
      <>
        <Button
          leftIcon={<WalletConnectIcon />}
          rightIcon={<ChevronRightIcon />}
          onClick={() => setOpen(true)}
        >
          {translate('plugins.walletConnectToDapps.header.connectDapp')}
        </Button>
        <ConnectModal isOpen={isOpen} onClose={() => setOpen(false)} />
      </>
    )
  }

  return (
    <Menu autoSelect={false}>
      <MenuButton
        as={Button}
        leftIcon={
          <DappAvatar
            name={walletConnect.dapp.name}
            image={walletConnect.dapp.icons[0]}
            connected={walletConnect.bridge.connector.connected}
            size={6}
            connectedDotSize={2}
            borderWidth={1}
          />
        }
        rightIcon={<ChevronDownIcon />}
        width={{ base: 'full', md: 'auto' }}
        textAlign='left'
      >
        {/* TODO: when setting "flex: unset" or "flex-shrink: none" to the Button content parent, overflow isn't a problem */}
        <RawText fontSize='sm'>{walletConnect.dapp.name}</RawText>
        <RawText fontSize='xs' color='gray.500'>
          {walletConnect.dapp.url.replace(/^https?:\/\//, '')}
        </RawText>
      </MenuButton>
      <MenuList>
        <DappHeaderMenuSummary />
      </MenuList>
    </Menu>
  )
}
