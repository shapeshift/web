import { CloseIcon } from '@chakra-ui/icons'
import { MenuGroup } from '@chakra-ui/menu'
import { Box, Flex, HStack, MenuDivider, MenuItem, VStack } from '@chakra-ui/react'
import { getSdkError } from '@walletconnect/utils'
import dayjs from 'dayjs'
import { useWalletConnectState } from 'plugins/walletConnectToDapps/v2/hooks/useWalletConnectState'
import type { WalletConnectState } from 'plugins/walletConnectToDapps/v2/types'
import { WalletConnectActionType } from 'plugins/walletConnectToDapps/v2/types'
import { useWalletConnectV2 } from 'plugins/walletConnectToDapps/v2/WalletConnectV2Provider'
import { useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { RawText, Text } from 'components/Text'
import { selectSelectedLocale } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { AddressAndChain } from './AddressAndChain'
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

  const { dispatch, ...state } = useWalletConnectV2()
  const { session, web3wallet, core } = state
  const { connectedAccounts } = useWalletConnectState(state)

  const handleDisconnect = useCallback(async () => {
    // Do this first - we want to always clear our session, even if the disconnect fails
    dispatch({ type: WalletConnectActionType.DELETE_SESSION })

    if (!session || !web3wallet || !core) return

    /*
     TODO: this is a hack to clear out all sessions, as the MVP supports only one at a time.
     In the future we want to support multiple pairings and sessions at once.
     */
    const activeTopics = Object.values(web3wallet.getActiveSessions()).map(session => session.topic)
    for await (const topic of activeTopics) {
      try {
        // This currently throws, and does not work: https://github.com/WalletConnect/walletconnect-monorepo/issues/1772
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
  }, [core, dispatch, session, web3wallet])

  const renderConnectedAddresses = useMemo(() => {
    return connectedAccounts.map(accountId => <AddressAndChain accountId={accountId} />)
  }, [connectedAccounts])

  if (!session || !web3wallet) return null

  return (
    <>
      <MenuGroup
        title={translate('plugins.walletConnectToDapps.header.connectedDapp')}
        ml={3}
        color='gray.500'
      >
        <HStack spacing={4} px={4} py={1}>
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

      <VStack px={4} py={1} fontWeight='medium' spacing={2} alignItems='stretch' fontSize='sm'>
        <HStack justifyContent='space-between' spacing={4}>
          <Text translation='plugins.walletConnectToDapps.header.menu.expiry' color='gray.500' />
          <RawText>
            {dayjs.unix(session.expiry).locale(selectedLocale).format('ll hh:mm A')}
          </RawText>
        </HStack>
        <HStack justifyContent='space-between' spacing={4} alignItems='flex-start'>
          <Text translation='plugins.walletConnectToDapps.header.menu.addresses' color='gray.500' />
          <Flex flexWrap='wrap' gap={2} flex={1} justifyContent='flex-end'>
            {renderConnectedAddresses}
          </Flex>
        </HStack>
      </VStack>

      <MenuDivider />
      <MenuItem fontWeight='medium' icon={<CloseIcon />} onClick={handleDisconnect} color='red.500'>
        {translate('plugins.walletConnectToDapps.header.menu.disconnect')}
      </MenuItem>
    </>
  )
}
