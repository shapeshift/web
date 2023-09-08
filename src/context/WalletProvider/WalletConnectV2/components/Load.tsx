import { DeleteIcon } from '@chakra-ui/icons'
import {
  Alert,
  AlertDescription,
  AlertIcon,
  Avatar,
  Box,
  Button,
  IconButton,
  ModalBody,
  ModalHeader,
  VStack,
} from '@chakra-ui/react'
import { Vault } from '@shapeshiftoss/hdwallet-native-vault'
import dayjs from 'dayjs'
import { useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { Row } from 'components/Row/Row'
import { RawText, Text } from 'components/Text'

type ConnectionInfo = {
  id: string
  name: string
  createdAt: number
  image: string
}
const testConnections: ConnectionInfo[] = [
  {
    id: 'test',
    name: 'Test Connection',
    createdAt: 1689629035,
    image:
      'https://explorer-api.walletconnect.com/v3/logo/md/8eeb0596-8b4c-4f57-731f-cd8251c65500?projectId=2f05ae7f1116030fde2d36508f472bfb',
  },
]

export const WalletConnectV2Load = () => {
  const [error, setError] = useState<string | null>(null)
  const [connections, setConnections] = useState<ConnectionInfo[]>(testConnections)
  const translate = useTranslate()

  const handleWalletSelect = (item: ConnectionInfo) => {
    console.info('do something', item)
  }

  const handleDelete = async (connection: ConnectionInfo) => {
    const result = window.confirm(
      translate('walletProvider.walletConnectV2.load.confirmForget', {
        connection: connection.name ?? connection.id,
      }),
    )
    if (result) {
      try {
        await Vault.delete(connection.id)
        setConnections([])
      } catch (e) {
        setError('walletProvider.walletConnectV2.load.error.delete')
      }
    }
  }

  return (
    <>
      <ModalHeader>
        <Text translation={'walletProvider.walletConnectV2.load.header'} />
      </ModalHeader>
      <ModalBody>
        <VStack mx={-4} spacing={0}>
          {connections.map(connection => {
            return (
              <Row
                key={connection.id}
                mx={-4}
                py={2}
                alignItems='center'
                justifyContent='space-between'
                variant='btn-ghost'
                colorScheme='blue'
                data-test='walletConnectV2-saved-wallet'
              >
                <Button
                  px={4}
                  variant='unstyled'
                  display='flex'
                  pl={4}
                  leftIcon={<Avatar size='sm' src={connection.image} />}
                  onClick={() => handleWalletSelect(connection)}
                  data-test='walletConnectV2-saved-wallet-button'
                >
                  <Box textAlign='left'>
                    <RawText
                      fontWeight='medium'
                      maxWidth='260px'
                      lineHeight='1.2'
                      mb={1}
                      noOfLines={1}
                      data-test='walletConnectV2-saved-wallet-name'
                    >
                      {connection.name}
                    </RawText>
                    <Text
                      fontSize='xs'
                      lineHeight='1.2'
                      color='text.subtle'
                      translation={[
                        'common.created',
                        { date: dayjs(connection.createdAt).fromNow() },
                      ]}
                    />
                  </Box>
                </Button>
                <Box display='flex' pr={2}>
                  <IconButton
                    aria-label={translate('common.forget')}
                    variant='ghost'
                    icon={<DeleteIcon />}
                    onClick={() => handleDelete(connection)}
                  />
                </Box>
              </Row>
            )
          })}
          {error && (
            <Alert status='error'>
              <AlertIcon />
              <AlertDescription>
                <Text translation={error} />
              </AlertDescription>
            </Alert>
          )}
        </VStack>
      </ModalBody>
    </>
  )
}
