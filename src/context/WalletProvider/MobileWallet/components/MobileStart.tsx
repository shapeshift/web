import { ArrowForwardIcon } from '@chakra-ui/icons'
import { Button, Divider, ModalBody, ModalHeader, Stack } from '@chakra-ui/react'
import { useEffect, useState } from 'react'
import type { RouteComponentProps } from 'react-router'
import { Text } from 'components/Text'

import { mobileLogger } from '../config'
import { getWalletCount } from '../mobileMessageHandlers'

const moduleLogger = mobileLogger.child({
  namespace: ['components', 'MobileStart'],
})

export const MobileStart = ({ history }: RouteComponentProps) => {
  const [hasLocalWallet, setHasLocalWallet] = useState<boolean>(false)

  useEffect(() => {
    ;(async () => {
      try {
        const localWallets = await getWalletCount()
        setHasLocalWallet(localWallets > 0)
      } catch (e) {
        moduleLogger.error(e, 'Error checking for wallets')
        setHasLocalWallet(false)
      }
    })()
  }, [setHasLocalWallet])

  return (
    <>
      <ModalHeader>
        <Text translation={'walletProvider.shapeShift.start.header'} />
      </ModalHeader>
      <ModalBody>
        <Text mb={4} color='gray.500' translation={'walletProvider.shapeShift.start.body'} />
        <Stack mt={6} spacing={4}>
          <Button
            variant='ghost-filled'
            colorScheme='blue'
            w='full'
            h='auto'
            px={6}
            py={4}
            justifyContent='space-between'
            rightIcon={<ArrowForwardIcon />}
            disabled={!hasLocalWallet}
            onClick={() => history.push('/mobile/load')}
            data-test='wallet-native-load-button'
          >
            <Text translation={'walletProvider.shapeShift.start.load'} />
          </Button>
          <Divider />
          <Button
            variant='ghost-filled'
            colorScheme='blue'
            w='full'
            h='auto'
            px={6}
            py={4}
            justifyContent='space-between'
            rightIcon={<ArrowForwardIcon />}
            onClick={() => history.push('/mobile/create')}
            data-test='wallet-native-create-button'
          >
            <Text translation={'walletProvider.shapeShift.start.create'} />
          </Button>
          <Button
            variant='ghost-filled'
            colorScheme='blue'
            w='full'
            h='auto'
            px={6}
            py={4}
            justifyContent='space-between'
            rightIcon={<ArrowForwardIcon />}
            onClick={() => history.push('/mobile/import')}
            data-test='wallet-native-import-button'
          >
            <Text translation={'walletProvider.shapeShift.start.import'} />
          </Button>
        </Stack>
      </ModalBody>
    </>
  )
}
