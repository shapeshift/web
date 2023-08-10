import { ArrowForwardIcon } from '@chakra-ui/icons'
import { Button, Divider, Flex, ModalBody, ModalHeader, Stack } from '@chakra-ui/react'
import { Vault } from '@shapeshiftoss/hdwallet-native-vault'
import { useEffect } from 'react'
import { useTranslate } from 'react-polyglot'
import type { RouteComponentProps } from 'react-router'
import { Text } from 'components/Text'
import { useStateIfMounted } from 'hooks/useStateIfMounted/useStateIfMounted'

export const NativeStart = ({ history }: RouteComponentProps) => {
  const [hasLocalWallet, setHasLocalWallet] = useStateIfMounted<boolean>(false)
  const translate = useTranslate()

  useEffect(() => {
    ;(async () => {
      try {
        const localWallets = await Vault.list()
        setHasLocalWallet(localWallets.length > 0)
      } catch (e) {
        console.error(e)
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
            onClick={() => history.push('/native/load')}
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
            onClick={() => history.push('/native/create')}
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
            onClick={() => history.push('/native/import')}
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
              onClick={() => history.push('/native/legacy/login')}
            >
              {translate('common.login')}
            </Button>
          </Flex>
        </Stack>
      </ModalBody>
    </>
  )
}
