import {
  Box,
  Button,
  Card,
  Divider,
  HStack,
  Image,
  useColorModeValue,
  VStack,
} from '@chakra-ui/react'
import { AddressSummaryCard } from 'plugins/walletConnectToDapps/components/modals/AddressSummaryCard'
import { ExternalLinkButton } from 'plugins/walletConnectToDapps/components/modals/ExternalLinkButtons'
import { ModalSection } from 'plugins/walletConnectToDapps/components/modals/ModalSection'
import { useWalletConnectState } from 'plugins/walletConnectToDapps/v2/hooks/useWalletConnectState'
import type {
  CosmosSignAminoCallRequest,
  CosmosSignDirectCallRequest,
} from 'plugins/walletConnectToDapps/v2/types'
import { CosmosSigningMethod } from 'plugins/walletConnectToDapps/v2/types'
import type { WalletConnectRequestModalProps } from 'plugins/walletConnectToDapps/v2/WalletConnectModalManager'
import { type FC, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { FoxIcon } from 'components/Icons/FoxIcon'
import { RawText, Text } from 'components/Text'
import { useWallet } from 'hooks/useWallet/useWallet'

export const CosmosSignMessageConfirmationModal: FC<
  WalletConnectRequestModalProps<CosmosSignDirectCallRequest | CosmosSignAminoCallRequest>
> = ({ onConfirm: handleConfirm, onReject: handleReject, state, topic }) => {
  const { address } = useWalletConnectState(state)
  const peerMetadata = state.sessionsByTopic[topic]?.peer.metadata

  const translate = useTranslate()
  const walletInfo = useWallet().state.walletInfo
  const WalletIcon = walletInfo?.icon ?? FoxIcon
  const cardBg = useColorModeValue('white', 'gray.850')
  const request = state.modalData.requestEvent?.params.request

  const methodSpecificContent: JSX.Element | null = useMemo(() => {
    if (request?.method === CosmosSigningMethod.COSMOS_SIGN_AMINO) {
      const {
        memo,
        sequence,
        msgs: messages,
        account_number: accountNumber,
        chain_id: chainId,
      } = request.params.signDoc

      return (
        <Box p={4}>
          <Text
            translation='plugins.walletConnectToDapps.modal.signMessage.memo'
            fontWeight='medium'
            mb={1}
          />
          <RawText fontWeight='medium' color='text.subtle'>
            {memo}
          </RawText>
          <Text
            translation='plugins.walletConnectToDapps.modal.signMessage.messages'
            fontWeight='medium'
            mb={1}
          />
          <RawText fontWeight='medium' color='text.subtle'>
            {messages.length > 0
              ? messages
              : translate('plugins.walletConnectToDapps.modal.signMessage.noMessages')}
          </RawText>
          <Text
            translation='plugins.walletConnectToDapps.modal.signMessage.sequence'
            fontWeight='medium'
            mb={1}
          />
          <RawText fontWeight='medium' color='text.subtle'>
            {sequence}
          </RawText>
          <Text
            translation='plugins.walletConnectToDapps.modal.signMessage.accountNumber'
            fontWeight='medium'
            mb={1}
          />
          <RawText fontWeight='medium' color='text.subtle'>
            {accountNumber}
          </RawText>
          <Text
            translation='plugins.walletConnectToDapps.modal.signMessage.chainId'
            fontWeight='medium'
            mb={1}
          />
          <RawText fontWeight='medium' color='text.subtle'>
            {chainId}
          </RawText>
        </Box>
      )
    } else if (request?.method === CosmosSigningMethod.COSMOS_SIGN_DIRECT) {
      const authInfo = request.params.signDoc.authInfoBytes
      const body = request.params.signDoc.bodyBytes

      return (
        <Box p={4}>
          <Text
            translation='plugins.walletConnectToDapps.modal.signMessage.authInfo'
            fontWeight='medium'
            mb={1}
          />
          <RawText fontWeight='medium' color='text.subtle'>
            {authInfo}
          </RawText>
          <Text
            translation='plugins.walletConnectToDapps.modal.signMessage.body'
            fontWeight='medium'
            mb={1}
          />
          <RawText fontWeight='medium' color='text.subtle'>
            {body}
          </RawText>
        </Box>
      )
    } else return null
  }, [request?.method, request?.params.signDoc, translate])

  if (!peerMetadata) return null

  return (
    <>
      <ModalSection title='plugins.walletConnectToDapps.modal.signMessage.signingFrom'>
        <AddressSummaryCard address={address ?? ''} icon={<WalletIcon w='full' h='full' />} />
      </ModalSection>
      <ModalSection title='plugins.walletConnectToDapps.modal.signMessage.requestFrom'>
        <Card bg={cardBg} borderRadius='md'>
          <HStack align='center' p={4}>
            <Image borderRadius='full' boxSize='24px' src={peerMetadata.icons[0]} />
            <RawText fontWeight='semibold' flex={1}>
              {peerMetadata.name}
            </RawText>
            <ExternalLinkButton href={peerMetadata.url} ariaLabel={peerMetadata.name} />
          </HStack>
          <Divider />
          {methodSpecificContent}
        </Card>
      </ModalSection>
      <Text
        fontWeight='medium'
        color='text.subtle'
        translation='plugins.walletConnectToDapps.modal.signMessage.description'
      />
      <VStack spacing={4}>
        <Button
          size='lg'
          width='full'
          colorScheme='blue'
          type='submit'
          onClick={handleConfirm}
          isDisabled={true}
        >
          {translate('plugins.walletConnectToDapps.modal.signMessage.comingSoon')}
        </Button>
        <Button size='lg' width='full' onClick={handleReject}>
          {translate('plugins.walletConnectToDapps.modal.signMessage.reject')}
        </Button>
      </VStack>
    </>
  )
}
