import { ArrowForwardIcon } from '@chakra-ui/icons'
import { Button, Divider, Flex, ModalBody, ModalHeader, Stack } from '@chakra-ui/react'
import { useEffect, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import type { RouteComponentProps } from 'react-router'
import { Text } from 'components/Text'

import { getWalletCount } from '../mobileMessageHandlers'

export const MobileStart = ({ history }: RouteComponentProps) => {
  const [hasLocalWallet, setHasLocalWallet] = useState<boolean>(false)
  const translate = useTranslate()

  useEffect(() => {
    ;(async () => {
      try {
        const localWallets = await getWalletCount()
        setHasLocalWallet(localWallets > 0)
      } catch (e) {
        console.log(e)
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
        <Text mb={4} color='text.subtle' translation={'walletProvider.shapeShift.start.body'} />
        <Stack mt={6} spacing={4}>
          <Button
            w='full'
            h='auto'
            px={6}
            py={4}
            justifyContent='space-between'
            rightIcon={<ArrowForwardIcon />}
            isDisabled={!hasLocalWallet}
            onClick={() => history.push('/mobile/load')}
            data-test='wallet-native-load-button'
          >
            <Text translation={'walletProvider.shapeShift.start.load'} />
          </Button>
          <Divider />
          <Button
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
          <Divider mt={4} />
          <Flex
            direction={['column', 'row']}
            mt={2}
            pt={4}
            justifyContent='center'
            alignItems='center'
          >
            <Text translation={'walletProvider.shapeShift.legacy.haveMobileWallet'} />
            <Button
              variant='link'
              ml={[0, 1.5]}
              borderTopRadius='none'
              colorScheme='blue'
              onClick={() => history.push('/mobile/legacy/login')}
            >
              {translate('common.login')}
            </Button>
          </Flex>
        </Stack>
      </ModalBody>
    </>
  )
}
