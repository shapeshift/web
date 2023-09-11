import { SmallCloseIcon } from '@chakra-ui/icons'
import {
  Accordion,
  AccordionButton,
  AccordionIcon,
  AccordionItem,
  AccordionPanel,
  Box,
  Button,
  HStack,
  MenuGroup,
  VStack,
} from '@chakra-ui/react'
import { getSdkError } from '@walletconnect/utils'
import dayjs from 'dayjs'
import { useWalletConnectState } from 'plugins/walletConnectToDapps/v2/hooks/useWalletConnectState'
import { WalletConnectActionType } from 'plugins/walletConnectToDapps/v2/types'
import { useWalletConnectV2 } from 'plugins/walletConnectToDapps/v2/WalletConnectV2Provider'
import { useCallback } from 'react'
import { useTranslate } from 'react-polyglot'
import { RawText, Text } from 'components/Text'
import { selectSelectedLocale } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { AddressLinks } from './AddressLinks'
import { DappAvatar } from './DappAvatar'
import { Networks } from './Networks'

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
     TODO: we only support one session at a time (the most recent)
     In the future we want to support multiple pairings and sessions at once.
     */
    const activeTopics = Object.values(web3wallet.getActiveSessions()).map(session => session.topic)
    const mostRecentTopic = activeTopics.slice(-1)[0]

    try {
      await web3wallet.disconnectSession({
        topic: mostRecentTopic,
        reason: getSdkError('USER_DISCONNECTED'),
      })
    } catch (e) {
      throw new Error(`Error disconnecting session: ${e}, topic: ${mostRecentTopic}`)
    }
  }, [core, dispatch, session, web3wallet])

  if (!session || !web3wallet) return null

  return (
    <>
      <MenuGroup
        title={translate('plugins.walletConnectToDapps.header.connectedDapp')}
        ml={3}
        color='text.subtle'
      >
        <Accordion allowToggle defaultIndex={0} variant='default'>
          <AccordionItem borderBottomWidth={0}>
            <AccordionButton width='full'>
              <HStack spacing={4} py={1} width='full'>
                <DappAvatar
                  name={session.peer.metadata.name}
                  image={session.peer.metadata.icons?.[0]}
                  connected={session.acknowledged}
                  display={{ base: 'none', md: 'block' }}
                />
                <Box textAlign='left'>
                  <RawText
                    maxWidth='215px'
                    overflow='hidden'
                    textOverflow='ellipsis'
                    whiteSpace='nowrap'
                    fontWeight='medium'
                    lineHeight='shorter'
                  >
                    {session.peer.metadata.name}
                  </RawText>
                  <RawText
                    fontSize='sm'
                    color='text.subtle'
                    maxWidth='215px'
                    overflow='hidden'
                    textOverflow='ellipsis'
                    whiteSpace='nowrap'
                    lineHeight='shorter'
                  >
                    {session.peer.metadata.url.replace(/^https?:\/\//, '')}
                  </RawText>
                </Box>
                <AccordionIcon ml='auto' />
              </HStack>
            </AccordionButton>
            <AccordionPanel px={4} pt={0} pb={4}>
              <VStack fontWeight='medium' spacing={2} alignItems='stretch' fontSize='sm'>
                <HStack justifyContent='space-between' spacing={4}>
                  <Text
                    translation='plugins.walletConnectToDapps.header.menu.expiry'
                    color='text.subtle'
                  />
                  <RawText>
                    {dayjs.unix(session.expiry).locale(selectedLocale).format('ll LT')}
                  </RawText>
                </HStack>
                <AddressLinks accountIds={connectedAccounts} />
                <Networks accountIds={connectedAccounts} />
                <Button
                  colorScheme='red'
                  size='sm'
                  onClick={handleDisconnect}
                  leftIcon={<SmallCloseIcon />}
                  mt={2}
                >
                  <Text translation='plugins.walletConnectToDapps.header.menu.disconnect' />
                </Button>
              </VStack>
            </AccordionPanel>
          </AccordionItem>
        </Accordion>
      </MenuGroup>
    </>
  )
}
