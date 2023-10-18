import { ArrowForwardIcon } from '@chakra-ui/icons'
import type { ResponsiveValue } from '@chakra-ui/react'
import { Button, Divider, Flex, ModalBody, ModalHeader, Stack } from '@chakra-ui/react'
import { Vault } from '@shapeshiftoss/hdwallet-native-vault'
import type { Property } from 'csstype'
import { useCallback, useEffect } from 'react'
import { useTranslate } from 'react-polyglot'
import type { RouteComponentProps } from 'react-router'
import { Text } from 'components/Text'
import { useStateIfMounted } from 'hooks/useStateIfMounted/useStateIfMounted'

const directionProp: ResponsiveValue<Property.FlexDirection> = ['column', 'row']
const mlProp = [0, 1.5]

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

  const handleLoad = useCallback(() => history.push('/native/load'), [history])
  const handleCreate = useCallback(() => history.push('/native/create'), [history])
  const handleImport = useCallback(() => history.push('/native/import'), [history])
  const handleLogin = useCallback(() => history.push('/native/legacy/login'), [history])

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
            onClick={handleLoad}
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
            onClick={handleCreate}
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
            onClick={handleImport}
            data-test='wallet-native-import-button'
          >
            <Text translation={'walletProvider.shapeShift.start.import'} />
          </Button>
          <Divider mt={4} />
          <Flex direction={directionProp} mt={2} pt={4} justifyContent='center' alignItems='center'>
            <Text translation={'walletProvider.shapeShift.legacy.haveMobileWallet'} />
            <Button
              variant='link'
              ml={mlProp}
              borderTopRadius='none'
              colorScheme='blue'
              onClick={handleLogin}
            >
              {translate('common.login')}
            </Button>
          </Flex>
        </Stack>
      </ModalBody>
    </>
  )
}
