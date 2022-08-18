import { ArrowForwardIcon } from '@chakra-ui/icons'
import { Button, Divider, Flex, ModalBody, ModalHeader, Stack } from '@chakra-ui/react'
import { useEffect, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { RouteComponentProps } from 'react-router-dom'
import { RawText, Text } from 'components/Text'
import {
  addWallet,
  deleteWallet,
  getWallet,
  listWallets,
} from 'context/WalletProvider/MobileWallet/mobileMessageHandlers'

export const MobileStart = ({ history }: RouteComponentProps) => {
  // const { state, dispatch } = useWallet()
  // const [error, setError] = useState<string | null>(null)
  // const [wallets, setWallets] = useState<VaultInfo[]>([])
  const translate = useTranslate()
  const [walletExists, setWalletExists] = useState<boolean | null>(null)

  useEffect(() => {
    ;(async () => setWalletExists(Boolean((await listWallets()).length)))()
  })

  return (
    <>
      <ModalHeader>
        <Text translation={'walletProvider.shapeShift.load.header'} />
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
            disabled={!walletExists}
            onClick={async () => {
              console.warn('mnemonic', await getWallet('1'))
            }}
            data-test='wallet-native-load-button'
          >
            <RawText>Load Wallet</RawText>
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
            onClick={async () => {
              console.warn(
                'save',
                await addWallet({
                  label: 'All',
                  mnemonic: 'all all all all all all all all all all all all',
                }),
              )
            }}
            data-test='wallet-native-create-button'
          >
            <RawText>Save All Seed</RawText>
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
            onClick={async () => {
              console.warn('clear', await deleteWallet('*'))
            }}
            data-test='wallet-native-import-button'
          >
            <RawText>Delete Wallet</RawText>
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
