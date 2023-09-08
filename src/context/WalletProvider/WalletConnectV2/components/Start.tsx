import { ArrowForwardIcon } from '@chakra-ui/icons'
import { Button, Divider, ModalBody, ModalHeader, Stack } from '@chakra-ui/react'
import { Vault } from '@shapeshiftoss/hdwallet-native-vault'
import { useEffect } from 'react'
import type { RouteComponentProps } from 'react-router'
import { Text } from 'components/Text'
import { useStateIfMounted } from 'hooks/useStateIfMounted/useStateIfMounted'

export const WalletConnectV2Start = ({ history }: RouteComponentProps) => {
  const [hasLocalWallet, setHasLocalWallet] = useStateIfMounted<boolean>(false)

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
        <Text translation={'walletProvider.walletConnectV2.start.header'} />
      </ModalHeader>
      <ModalBody>
        <Stack mt={6} spacing={4}>
          <Button
            w='full'
            h='auto'
            px={6}
            py={4}
            justifyContent='space-between'
            rightIcon={<ArrowForwardIcon />}
            isDisabled={!hasLocalWallet}
            onClick={() => history.push('/walletconnectv2/load')}
            data-test='wallet-walletConnectV2-load-button'
          >
            <Text translation={'walletProvider.walletConnectV2.start.load'} />
          </Button>
          <Divider />
          <Button
            w='full'
            h='auto'
            px={6}
            py={4}
            justifyContent='space-between'
            rightIcon={<ArrowForwardIcon />}
            onClick={() => history.push('/walletconnectv2/create')}
            data-test='wallet-walletConnectV2-create-button'
          >
            <Text translation={'walletProvider.walletConnectV2.start.create'} />
          </Button>
        </Stack>
      </ModalBody>
    </>
  )
}
