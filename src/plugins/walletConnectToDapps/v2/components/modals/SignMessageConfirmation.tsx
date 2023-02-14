import { Box, Button, Divider, HStack, Image, useColorModeValue, VStack } from '@chakra-ui/react'
import { AddressSummaryCard } from 'plugins/walletConnectToDapps/components/modals/AddressSummaryCard'
import { ExternalLinkButton } from 'plugins/walletConnectToDapps/components/modals/ExternalLinkButtons'
import { ModalSection } from 'plugins/walletConnectToDapps/components/modals/ModalSection'
import {
  extractConnectedAccounts,
  getSignParamsMessage,
  getWalletAddressFromParams,
} from 'plugins/walletConnectToDapps/utils'
import type { WalletConnectRequestModalProps } from 'plugins/walletConnectToDapps/v2/WalletConnectModalManager'
import type { FC } from 'react'
import { useTranslate } from 'react-polyglot'
import { Card } from 'components/Card/Card'
import { FoxIcon } from 'components/Icons/FoxIcon'
import { RawText, Text } from 'components/Text'
import { useWallet } from 'hooks/useWallet/useWallet'
import { assertIsDefined } from 'lib/utils'

export const SignMessageConfirmationModal: FC<WalletConnectRequestModalProps> = ({
  onConfirm: handleConfirm,
  onReject: handleReject,
  state: {
    modalData: { requestEvent },
    session,
  },
}) => {
  assertIsDefined(requestEvent)
  console.log('[debug] requestEvent', { requestEvent })

  const translate = useTranslate()
  const walletInfo = useWallet().state.walletInfo
  const WalletIcon = walletInfo?.icon ?? FoxIcon
  const cardBg = useColorModeValue('white', 'gray.850')

  const { params } = requestEvent
  const { request } = params

  const connectedAccounts = extractConnectedAccounts(session)
  const address = getWalletAddressFromParams(connectedAccounts, params)
  const message = getSignParamsMessage(request.params)

  return (
    <VStack p={6} spacing={6} alignItems='stretch'>
      <ModalSection title='plugins.walletConnectToDapps.modal.signMessage.signingFrom'>
        <AddressSummaryCard address={address} icon={<WalletIcon w='full' h='full' />} />
      </ModalSection>
      <ModalSection title='plugins.walletConnectToDapps.modal.signMessage.requestFrom'>
        <Card bg={cardBg} borderRadius='md'>
          <HStack align='center' p={4}>
            <Image borderRadius='full' boxSize='24px' src={session.peer.metadata.icons[0]} />
            <RawText fontWeight='semibold' flex={1}>
              {session.peer.metadata.name}
            </RawText>
            <ExternalLinkButton
              href={session.peer.metadata.url}
              ariaLabel={session.peer.metadata.name}
            />
          </HStack>
          <Divider />
          <Box p={4}>
            <Text
              translation='plugins.walletConnectToDapps.modal.signMessage.message'
              fontWeight='medium'
              mb={1}
            />
            <RawText fontWeight='medium' color='gray.500'>
              {message}
            </RawText>
          </Box>
        </Card>
      </ModalSection>
      <Text
        fontWeight='medium'
        color='gray.500'
        translation='plugins.walletConnectToDapps.modal.signMessage.description'
      />
      <VStack spacing={4}>
        <Button size='lg' width='full' colorScheme='blue' type='submit' onClick={handleConfirm}>
          {translate('plugins.walletConnectToDapps.modal.signMessage.confirm')}
        </Button>
        <Button size='lg' width='full' onClick={handleReject}>
          {translate('plugins.walletConnectToDapps.modal.signMessage.reject')}
        </Button>
      </VStack>
    </VStack>
  )
}
