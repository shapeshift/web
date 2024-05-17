import { CheckIcon, SmallCloseIcon } from '@chakra-ui/icons'
import {
  AccordionButton,
  AccordionIcon,
  AccordionItem,
  AccordionPanel,
  Box,
  Button,
  HStack,
  VStack,
} from '@chakra-ui/react'
import type { SessionTypes } from '@walletconnect/types'
import { getSdkError } from '@walletconnect/utils'
import dayjs from 'dayjs'
import { WalletConnectActionType } from 'plugins/walletConnectToDapps/types'
import { extractConnectedAccounts } from 'plugins/walletConnectToDapps/utils'
import { useWalletConnectV2 } from 'plugins/walletConnectToDapps/WalletConnectV2Provider'
import { useCallback, useMemo } from 'react'
import { RawText, Text } from 'components/Text'
import { selectSelectedLocale } from 'state/selectors'
import { useAppSelector } from 'state/store'

import { AddressLinks } from './AddressLinks'
import { DappAvatar } from './DappAvatar'
import { Networks } from './Networks'

const checkIcon = <CheckIcon />
const smallCloseIcon = <SmallCloseIcon />

export const Session = ({ session }: { session: SessionTypes.Struct }) => {
  const selectedLocale = useAppSelector(selectSelectedLocale)

  const { dispatch, web3wallet, core } = useWalletConnectV2()
  const connectedAccounts = useMemo(() => extractConnectedAccounts(session), [session])

  const handleDisconnect = useCallback(() => {
    // Do this first - we want to always clear our session, even if the disconnect fails
    dispatch({ type: WalletConnectActionType.DELETE_SESSION, payload: session })

    if (!web3wallet) return

    void web3wallet.disconnectSession({
      topic: session.topic,
      reason: getSdkError('USER_DISCONNECTED'),
    })
  }, [dispatch, session, web3wallet])

  const handleReconnect = useCallback(async () => {
    if (!web3wallet || !core) return

    // Reactivate the session then extend it - await is required to ensure execution order
    await core.pairing.activate({ topic: session.pairingTopic })
    await web3wallet.extendSession({ topic: session.topic })
  }, [core, session, web3wallet])

  const nowTtl = Date.now() / 1000
  const isExpired = session.expiry < nowTtl

  return (
    <AccordionItem borderBottomWidth={0}>
      <AccordionButton width='full'>
        <HStack spacing={4} py={1} width='full'>
          <DappAvatar
            image={session.peer.metadata.icons?.[0]}
            connected={session.acknowledged && !isExpired}
            size='sm'
          />
          <Box textAlign='left'>
            <RawText
              maxWidth='200px'
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
              maxWidth='200px'
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
            <RawText>{dayjs.unix(session.expiry).locale(selectedLocale).format('ll LT')}</RawText>
          </HStack>
          <AddressLinks accountIds={connectedAccounts} />
          <Networks accountIds={connectedAccounts} />
          {isExpired ? (
            <HStack justifyContent='space-between'>
              <Button
                colorScheme='green'
                size='sm'
                onClick={handleReconnect}
                leftIcon={checkIcon}
                mt={2}
                variant={'outline'}
              >
                <Text translation='plugins.walletConnectToDapps.header.menu.reconnect' />
              </Button>
              <Button
                colorScheme='red'
                size='sm'
                onClick={handleDisconnect}
                leftIcon={smallCloseIcon}
                mt={2}
              >
                <Text translation='plugins.walletConnectToDapps.header.menu.disconnect' />
              </Button>
            </HStack>
          ) : (
            <Button
              colorScheme='red'
              size='sm'
              onClick={handleDisconnect}
              leftIcon={smallCloseIcon}
              mt={2}
            >
              <Text translation='plugins.walletConnectToDapps.header.menu.disconnect' />
            </Button>
          )}
        </VStack>
      </AccordionPanel>
    </AccordionItem>
  )
}
