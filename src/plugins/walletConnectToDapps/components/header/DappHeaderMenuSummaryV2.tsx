import { CloseIcon } from '@chakra-ui/icons'
import { MenuGroup } from '@chakra-ui/menu'
import { Box, HStack, Link, MenuDivider, MenuItem, VStack } from '@chakra-ui/react'
import { getSdkError } from '@walletconnect/utils'
import dayjs from 'dayjs'
import { extractConnectedAccounts } from 'plugins/walletConnectToDapps/utils'
import type { WalletConnectState } from 'plugins/walletConnectToDapps/v2/types'
import { WalletConnectActionType } from 'plugins/walletConnectToDapps/v2/types'
import { useWalletConnectV2 } from 'plugins/walletConnectToDapps/v2/WalletConnectV2Provider'
import { useTranslate } from 'react-polyglot'
import { MiddleEllipsis } from 'components/MiddleEllipsis/MiddleEllipsis'
import { RawText, Text } from 'components/Text'
import { selectSelectedLocale } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { DappAvatar } from './DappAvatar'

export const extractChainIds = (session: WalletConnectState['session']): string[] => {
  const requiredNamespaces = session?.requiredNamespaces

  const requiredNamespacesValues = requiredNamespaces ? Object.values(requiredNamespaces) : []
  const allChains = requiredNamespacesValues
    .map(v => v.chains)
    .reduce(
      (acc, namespaceChains) => (acc && namespaceChains ? acc.concat(namespaceChains) : []),
      [],
    )
  return allChains ?? []
}

export const DappHeaderMenuSummaryV2 = () => {
  const selectedLocale = useAppSelector(selectSelectedLocale)

  const translate = useTranslate()

  const { session, web3wallet, core, dispatch } = useWalletConnectV2()
  const connectedChainIds = extractChainIds(session)

  if (!session || !web3wallet) return null

  const handleDisconnect = async () => {
    if (!session || !web3wallet || !core) return

    /*
     TODO: this is a hack to clear out all sessions, as the MVP supports only one at a time.
     In the future we want to support multiple pairings and sessions at once.
     */
    const activeTopics = Object.values(web3wallet.getActiveSessions()).map(session => session.topic)
    for await (const topic of activeTopics) {
      try {
        await web3wallet.disconnectSession({ topic, reason: getSdkError('USER_DISCONNECTED') })
      } catch (e) {
        throw new Error(`Error disconnecting session: ${e}, topic: ${topic}`)
      }
    }

    const pairedTopics = core.pairing.getPairings().map(pairing => pairing.topic)
    for await (const topic of pairedTopics) {
      try {
        await core.pairing.disconnect({ topic })
      } catch (e) {
        throw new Error(`Error disconnecting pairing: ${e}, topic: ${topic}`)
      }
    }

    dispatch({ type: WalletConnectActionType.DELETE_SESSION })
  }

  const connectedAccounts = extractConnectedAccounts(session)

  return (
    <>
      <MenuGroup
        title={translate('plugins.walletConnectToDapps.header.connectedDapp')}
        ml={3}
        color='gray.500'
      >
        <HStack spacing={4} px={3} py={1}>
          <DappAvatar
            name={session.peer.metadata.name}
            image={session.peer.metadata.icons[0]}
            connected={session.acknowledged}
          />
          <Box fontWeight='medium'>
            <RawText maxWidth='215px' overflow='hidden' textOverflow='ellipsis' whiteSpace='nowrap'>
              {session.peer.metadata.name}
            </RawText>
            <RawText
              fontSize='sm'
              color='gray.500'
              maxWidth='215px'
              overflow='hidden'
              textOverflow='ellipsis'
              whiteSpace='nowrap'
            >
              {session.peer.metadata.url.replace(/^https?:\/\//, '')}
            </RawText>
          </Box>
        </HStack>
      </MenuGroup>
      <MenuDivider />

      <VStack px={3} py={1} fontWeight='medium' spacing={1} alignItems='stretch'>
        <HStack justifyContent='space-between' spacing={4}>
          <Text translation='plugins.walletConnectToDapps.header.menu.expiry' color='gray.500' />
          <RawText>
            {dayjs.unix(session.expiry).locale(selectedLocale).format('ll hh:mm A')}
          </RawText>
        </HStack>
        <HStack justifyContent='space-between' spacing={4}>
          <Text translation='plugins.walletConnectToDapps.header.menu.addresses' color='gray.500' />
          {connectedAccounts.map(address => (
            <Link
              key={address}
              href={'walletConnect.accountExplorerAddressLink}${address'}
              isExternal
            >
              <MiddleEllipsis value={address} color='blue.200' />
            </Link>
          ))}
        </HStack>
        {session.acknowledged && (
          <HStack justifyContent='space-between' spacing={4}>
            <Text
              translation='plugins.walletConnectToDapps.header.menu.networks'
              color='gray.500'
            />
            <RawText>{connectedChainIds.join(', ')}</RawText>
          </HStack>
        )}
      </VStack>

      <MenuDivider />
      <MenuItem fontWeight='medium' icon={<CloseIcon />} onClick={handleDisconnect} color='red.500'>
        {translate('plugins.walletConnectToDapps.header.menu.disconnect')}
      </MenuItem>
    </>
  )
}
