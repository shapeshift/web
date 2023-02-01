import { ChevronDownIcon, ChevronRightIcon } from '@chakra-ui/icons'
import { Menu, MenuButton, MenuList } from '@chakra-ui/menu'
import { Button } from '@chakra-ui/react'
import { useWalletConnect } from 'plugins/walletConnectToDapps/WalletConnectBridgeContext'
import { useCallback, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { WalletConnectIcon } from 'components/Icons/WalletConnectIcon'
import { RawText } from 'components/Text'
import { trimWithEndEllipsis } from 'state/slices/portfolioSlice/utils'

import { useIsWalletConnectToDappsSupportedWallet } from '../../hooks/useIsWalletConnectToDappsSupportedWallet'
import { ConnectModal } from '../modal/connect/Connect'
import { DappAvatar } from './DappAvatar'
import { DappHeaderMenuSummary } from './DappHeaderMenuSummary'

export const WalletConnectToDappsHeaderButton = () => {
  const [isOpen, setOpen] = useState(false)
  const handleOpen = useCallback(() => setOpen(true), [])
  const handleClose = useCallback(() => setOpen(false), [])
  const translate = useTranslate()
  const walletConnect = useWalletConnect()

  const isWalletConnectToDappsSupportedWallet = useIsWalletConnectToDappsSupportedWallet()
  if (!isWalletConnectToDappsSupportedWallet) return null

  if (!walletConnect.connector || !walletConnect.dapp) {
    return (
      <>
        <Button
          leftIcon={<WalletConnectIcon />}
          rightIcon={<ChevronRightIcon />}
          onClick={handleOpen}
          isLoading={!!walletConnect.connector}
        >
          {translate('plugins.walletConnectToDapps.header.connectDapp')}
        </Button>
        <ConnectModal isOpen={isOpen} onClose={handleClose} />
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
            connected={walletConnect.connector.connected}
            size={6}
            connectedDotSize={2}
            borderWidth={1}
          />
        }
        rightIcon={<ChevronDownIcon />}
        width={{ base: 'full', md: 'auto' }}
        textAlign='left'
        flexShrink='none'
      >
        <RawText pr={{ base: 0, md: '20px' }} fontSize='sm'>
          {trimWithEndEllipsis(walletConnect.dapp.name, 16)}
        </RawText>
        <RawText fontSize='xs' color='gray.500'>
          {trimWithEndEllipsis(walletConnect.dapp.url.replace(/^https?:\/\//, ''), 18)}
        </RawText>
      </MenuButton>
      <MenuList zIndex={2}>
        <DappHeaderMenuSummary />
      </MenuList>
    </Menu>
  )
}
