import { ChevronDownIcon, ChevronRightIcon } from '@chakra-ui/icons'
import { Button, Menu, MenuButton, MenuList, useDisclosure } from '@chakra-ui/react'
import { DappHeaderMenuSummaryV2 } from 'plugins/walletConnectToDapps/components/header/DappHeaderMenuSummaryV2'
import { ConnectModal } from 'plugins/walletConnectToDapps/components/modals/connect/Connect'
import { useWalletConnect } from 'plugins/walletConnectToDapps/v1/WalletConnectBridgeContext'
import { useWalletConnectV2 } from 'plugins/walletConnectToDapps/v2/WalletConnectV2Provider'
import type { FC } from 'react'
import { useTranslate } from 'react-polyglot'
import { WalletConnectIcon } from 'components/Icons/WalletConnectIcon'
import { RawText } from 'components/Text'
import { useFeatureFlag } from 'hooks/useFeatureFlag/useFeatureFlag'
import { trimWithEndEllipsis } from 'state/slices/portfolioSlice/utils'

import { useIsWalletConnectToDappsSupportedWallet } from '../../hooks/useIsWalletConnectToDappsSupportedWallet'
import { DappAvatar } from './DappAvatar'
import { DappHeaderMenuSummary } from './DappHeaderMenuSummary'

export const WalletConnectToDappsHeaderButton: FC = () => {
  const { isOpen, onClose: handleClose, onOpen: handleOpen } = useDisclosure()
  const translate = useTranslate()
  const walletConnectV1 = useWalletConnect()
  const walletConnectV2 = useWalletConnectV2()

  const isWalletConnectToDappsV1Enabled = useFeatureFlag('WalletConnectToDapps')
  const isWalletConnectToDappsV2Enabled = useFeatureFlag('WalletConnectToDappsV2')

  const isWalletConnectToDappsSupportedWallet = useIsWalletConnectToDappsSupportedWallet()
  if (!isWalletConnectToDappsSupportedWallet) return null

  const walletConnectV2Connected = !!walletConnectV2.session?.peer

  const walletConnectButtons = (
    <>
      {(isWalletConnectToDappsV1Enabled || isWalletConnectToDappsV2Enabled) && (
        <Button
          leftIcon={<WalletConnectIcon />}
          rightIcon={<ChevronRightIcon />}
          onClick={handleOpen}
          width={{ base: 'full', md: 'auto' }}
        >
          {translate('plugins.walletConnectToDapps.header.connectDapp')}
        </Button>
      )}
      <ConnectModal isOpen={isOpen} onClose={handleClose} />
    </>
  )

  const walletConnectV1ConnectedButton = (
    <Menu autoSelect={false}>
      <MenuButton
        as={Button}
        leftIcon={
          <DappAvatar
            name={walletConnectV1.dapp?.name ?? ''}
            image={walletConnectV1.dapp?.icons[0] ?? ''}
            connected={walletConnectV1.connector?.connected ?? false}
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
          {trimWithEndEllipsis(walletConnectV1.dapp?.name, 16)}
        </RawText>
        <RawText fontSize='xs' color='text.subtle'>
          {trimWithEndEllipsis(walletConnectV1.dapp?.url.replace(/^https?:\/\//, ''), 18)}
        </RawText>
      </MenuButton>
      <MenuList zIndex={2}>
        <DappHeaderMenuSummary />
      </MenuList>
    </Menu>
  )

  const walletConnectV2ConnectedButton = (
    <Menu autoSelect={false}>
      <MenuButton
        as={Button}
        leftIcon={
          <DappAvatar
            name={walletConnectV2.session?.peer.metadata.name ?? ''}
            image={walletConnectV2.session?.peer.metadata.icons[0] ?? ''}
            connected={walletConnectV2.session?.acknowledged ?? false}
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
          {trimWithEndEllipsis(walletConnectV2.session?.peer.metadata.name, 16)}
        </RawText>
        <RawText fontSize='xs' color='text.subtle'>
          {trimWithEndEllipsis(
            walletConnectV2.session?.peer.metadata.url.replace(/^https?:\/\//, ''),
            18,
          )}
        </RawText>
      </MenuButton>
      <MenuList
        zIndex='banner'
        maxWidth={{ base: '280px', md: 'xs' }}
        minWidth={{ base: 0, md: 'xs' }}
        display='flex'
        flexDir='column'
      >
        <DappHeaderMenuSummaryV2 />
      </MenuList>
    </Menu>
  )

  switch (true) {
    case (!walletConnectV1.connector || !walletConnectV1.dapp) && !walletConnectV2Connected:
      return walletConnectButtons
    case walletConnectV2Connected:
      return walletConnectV2ConnectedButton
    default:
      return walletConnectV1ConnectedButton
  }
}
