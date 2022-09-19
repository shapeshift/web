import { ChevronDownIcon, ChevronRightIcon } from '@chakra-ui/icons'
import { Menu, MenuButton, MenuList } from '@chakra-ui/menu'
import { Button, MenuItem } from '@chakra-ui/react'
import { useWalletConnect } from 'plugins/walletConnectToDapps/WalletConnectBridgeContext'
import { useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { WalletConnectIcon } from 'components/Icons/WalletConnectIcon'
import { RawText } from 'components/Text'

import { ConnectModal } from '../modal/connect/ConnectModal'
import { WalletConnectModal } from '../modal/WalletConnectModal'
import { DappAvatar } from './DappAvatar'
import { DappHeaderMenuSummary } from './DappHeaderMenuSummary'

export const WalletConnectToDappsHeaderButton = () => {
  const [isOpen, setOpen] = useState(false)
  const translate = useTranslate()
  const walletConnect = useWalletConnect()
  const dapp = walletConnect.bridge?.connector.peerMeta

  if (!walletConnect.bridge || !dapp) {
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
            name={dapp.name}
            image={dapp.icons[0]}
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
        <RawText fontSize='sm'>{dapp.name}</RawText>
        <RawText fontSize='xs' color='gray.500'>
          {dapp.name}
        </RawText>
      </MenuButton>
      <MenuList>
        <DappHeaderMenuSummary />

        <MenuItem fontWeight='medium' onClick={() => setOpen(true)}>
          Debug
        </MenuItem>
      </MenuList>

      <WalletConnectModal isOpen={isOpen} onClose={() => setOpen(false)}>
        children
      </WalletConnectModal>
    </Menu>
  )
}
