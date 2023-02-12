import { MenuGroup } from '@chakra-ui/menu'
import { Box, HStack, Link, MenuDivider, VStack } from '@chakra-ui/react'
import dayjs from 'dayjs'
import type { WalletConnectState } from 'plugins/walletConnectV2/types'
import { useWalletConnectV2 } from 'plugins/walletConnectV2/WalletConnectV2Provider'
import { useTranslate } from 'react-polyglot'
import { MiddleEllipsis } from 'components/MiddleEllipsis/MiddleEllipsis'
import { RawText, Text } from 'components/Text'
import { selectSelectedLocale } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { DappAvatar } from './DappAvatar'

export const extractChainIds = (state: WalletConnectState): string[] => {
  const requiredNamespaces = state.session?.requiredNamespaces

  const requiredNamespacesValues = requiredNamespaces ? Object.values(requiredNamespaces) : []
  const allChains = requiredNamespacesValues
    .map(v => v.chains)
    .reduce(
      (acc, namespaceChains) => (acc && namespaceChains ? acc.concat(namespaceChains) : []),
      [],
    )
  return allChains ?? []
}

export const extractConnectedAccounts = (state: WalletConnectState): string[] => {
  const namespaces = state.session?.namespaces

  const requiredNamespacesValues = namespaces ? Object.values(namespaces) : []
  const allAccounts = requiredNamespacesValues
    .map(v => v.accounts)
    .reduce(
      (acc, namespaceAccounts) => (acc && namespaceAccounts ? acc.concat(namespaceAccounts) : []),
      [],
    )
  return allAccounts ?? []
}

export const DappHeaderMenuSummaryV2 = () => {
  const selectedLocale = useAppSelector(selectSelectedLocale)

  const translate = useTranslate()

  const walletConnectV2 = useWalletConnectV2()
  const connectedChainIds = extractChainIds(walletConnectV2)

  // const handleDisconnect = walletConnect.disconnect

  const connectedAccounts = extractConnectedAccounts(walletConnectV2)

  return walletConnectV2.session ? (
    <>
      <MenuGroup
        title={translate('plugins.walletConnectToDapps.header.connectedDapp')}
        ml={3}
        color='gray.500'
      >
        <HStack spacing={4} px={3} py={1}>
          <DappAvatar
            name={walletConnectV2.session.peer.metadata.name}
            image={walletConnectV2.session.peer.metadata.icons[0]}
            connected={walletConnectV2.session.acknowledged}
          />
          <Box fontWeight='medium'>
            <RawText maxWidth='215px' overflow='hidden' textOverflow='ellipsis' whiteSpace='nowrap'>
              {walletConnectV2.session.peer.metadata.name}
            </RawText>
            <RawText
              fontSize='sm'
              color='gray.500'
              maxWidth='215px'
              overflow='hidden'
              textOverflow='ellipsis'
              whiteSpace='nowrap'
            >
              {walletConnectV2.session.peer.metadata.url.replace(/^https?:\/\//, '')}
            </RawText>
          </Box>
        </HStack>
      </MenuGroup>
      <MenuDivider />

      <VStack px={3} py={1} fontWeight='medium' spacing={1} alignItems='stretch'>
        <HStack justifyContent='space-between' spacing={4}>
          <Text translation='plugins.walletConnectToDapps.header.menu.expiry' color='gray.500' />
          <RawText>
            {dayjs(walletConnectV2.session.expiry).locale(selectedLocale).format('ll hh:mm A')}
          </RawText>
        </HStack>
        <HStack justifyContent='space-between' spacing={4}>
          <Text translation='plugins.walletConnectToDapps.header.menu.address' color='gray.500' />
          <Link
            href={'walletConnect.accountExplorerAddressLink}${connectedAccountAddress'}
            isExternal
          >
            <MiddleEllipsis value={connectedAccounts[0]} color='blue.200' />
          </Link>
        </HStack>
        {walletConnectV2.session.acknowledged && (
          <HStack justifyContent='space-between' spacing={4}>
            <Text translation='plugins.walletConnectToDapps.header.menu.network' color='gray.500' />
            <RawText>{connectedChainIds}</RawText>
          </HStack>
        )}
      </VStack>

      <MenuDivider />
      {/*<MenuItem fontWeight='medium' icon={<CloseIcon />} onClick={handleDisconnect} color='red.500'>*/}
      {/*  {translate('plugins.walletConnectToDapps.header.menu.disconnect')}*/}
      {/*</MenuItem>*/}
    </>
  ) : null
}
