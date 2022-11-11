import { ExternalLinkIcon } from '@chakra-ui/icons'
import {
  Box,
  Button,
  Divider,
  HStack,
  IconButton,
  Image,
  Link,
  useColorModeValue,
  useToast,
  VStack,
} from '@chakra-ui/react'
import { convertHexToUtf8 } from '@walletconnect/utils'
import { useWalletConnect } from 'plugins/walletConnectToDapps/WalletConnectBridgeContext'
import { useCallback, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { Card } from 'components/Card/Card'
import { KeepKeyIcon } from 'components/Icons/KeepKeyIcon'
import { RawText, Text } from 'components/Text'

import { AddressSummaryCard } from './AddressSummaryCard'

export const SignMessageConfirmation = () => {
  const translate = useTranslate()
  const cardBg = useColorModeValue('white', 'gray.850')

  const walletConnect = useWalletConnect()

  const [loading, setLoading] = useState(false)

  const { bridge, requests, removeRequest } = useWalletConnect()
  const toast = useToast()

  const currentRequest = requests[0]
  const message = convertHexToUtf8(currentRequest.payload.params[0])

  const onConfirm = useCallback(
    async (txData: any) => {
      try {
        setLoading(true)
        await bridge?.approve(requests[0], txData).then(() => removeRequest(currentRequest.id))
        removeRequest(currentRequest.id)
      } catch (e) {
        toast({
          title: 'Error',
          description: `Transaction error ${e}`,
          isClosable: true,
        })
      } finally {
        setLoading(false)
      }
    },
    [bridge, currentRequest.id, removeRequest, requests, toast],
  )

  const onReject = useCallback(async () => {
    await bridge?.connector.rejectRequest({
      id: currentRequest.id,
      error: { message: 'Rejected by user' },
    })
    removeRequest(currentRequest.id)
    setLoading(false)
  }, [bridge, currentRequest, removeRequest])

  if (!walletConnect.bridge || !walletConnect.dapp) return null

  return (
    <VStack p={6} spacing={6} alignItems='stretch'>
      <Box>
        <Text
          fontWeight='medium'
          translation='plugins.walletConnectToDapps.modal.signMessage.signingFrom'
          mb={4}
        />
        <AddressSummaryCard
          address={walletConnect.bridge?.connector.accounts[0]}
          name='My Wallet' // TODO: what string do we put here?
          icon={<KeepKeyIcon color='gray.500' w='full' h='full' />}
        />
      </Box>

      <Box>
        <Text
          fontWeight='medium'
          translation='plugins.walletConnectToDapps.modal.signMessage.requestFrom'
          mb={4}
        />
        <Card bg={cardBg} borderRadius='md'>
          <HStack align='center' pl={4}>
            <Image borderRadius='full' boxSize='24px' src={walletConnect.dapp.icons[0]} />
            <RawText fontWeight='semibold' flex={1}>
              {walletConnect.dapp.name}
            </RawText>
            <Link href={walletConnect.dapp.url.replace(/^https?:\/\//, '')} isExternal>
              <IconButton
                icon={<ExternalLinkIcon />}
                variant='ghost'
                aria-label={walletConnect.dapp.name}
                colorScheme='gray'
              />
            </Link>
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
      </Box>

      <Text
        fontWeight='medium'
        color='gray.500'
        translation='plugins.walletConnectToDapps.modal.signMessage.description'
      />

      <VStack spacing={4}>
        <Button
          isLoading={loading}
          size='lg'
          width='full'
          colorScheme='blue'
          type='submit'
          onClick={onConfirm}
        >
          {translate('plugins.walletConnectToDapps.modal.signMessage.confirm')}
        </Button>
        <Button size='lg' width='full' onClick={onReject}>
          {translate('plugins.walletConnectToDapps.modal.signMessage.reject')}
        </Button>
      </VStack>
    </VStack>
  )
}
