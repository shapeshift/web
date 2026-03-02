import { Box, Card, VStack } from '@chakra-ui/react'
import type { FC } from 'react'
import { useTranslate } from 'react-polyglot'

import { RawText, Text } from '@/components/Text'
import { ModalSection } from '@/plugins/walletConnectToDapps/components/modals/ModalSection'
import type { CosmosSignAminoCallRequestParams } from '@/plugins/walletConnectToDapps/types'

type CosmosSignAminoContentProps = {
  signDoc: CosmosSignAminoCallRequestParams['signDoc']
}

export const CosmosSignAminoContent: FC<CosmosSignAminoContentProps> = ({ signDoc }) => {
  const translate = useTranslate()

  const {
    memo,
    sequence,
    msgs: messages,
    account_number: accountNumber,
    chain_id: chainId,
  } = signDoc

  return (
    <ModalSection title='plugins.walletConnectToDapps.modal.signMessage.message'>
      <Card borderRadius='2xl' p={4}>
        <VStack align='stretch' spacing={3}>
          <Box>
            <Text
              translation='plugins.walletConnectToDapps.modal.signMessage.chainId'
              fontWeight='medium'
              mb={1}
            />
            <RawText fontWeight='medium' color='text.subtle'>
              {chainId}
            </RawText>
          </Box>
          <Box>
            <Text
              translation='plugins.walletConnectToDapps.modal.signMessage.memo'
              fontWeight='medium'
              mb={1}
            />
            <RawText fontWeight='medium' color='text.subtle'>
              {memo || '-'}
            </RawText>
          </Box>
          <Box>
            <Text
              translation='plugins.walletConnectToDapps.modal.signMessage.messages'
              fontWeight='medium'
              mb={1}
            />
            <RawText fontWeight='medium' color='text.subtle' whiteSpace='pre-wrap' fontSize='sm'>
              {messages.length > 0
                ? JSON.stringify(messages, null, 2)
                : translate('plugins.walletConnectToDapps.modal.signMessage.noMessages')}
            </RawText>
          </Box>
          <Box>
            <Text
              translation='plugins.walletConnectToDapps.modal.signMessage.sequence'
              fontWeight='medium'
              mb={1}
            />
            <RawText fontWeight='medium' color='text.subtle'>
              {sequence}
            </RawText>
          </Box>
          <Box>
            <Text
              translation='plugins.walletConnectToDapps.modal.signMessage.accountNumber'
              fontWeight='medium'
              mb={1}
            />
            <RawText fontWeight='medium' color='text.subtle'>
              {accountNumber}
            </RawText>
          </Box>
        </VStack>
      </Card>
    </ModalSection>
  )
}
