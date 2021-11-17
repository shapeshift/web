import { ArrowForwardIcon } from '@chakra-ui/icons'
import { Button, Divider, ModalBody, ModalHeader, Stack } from '@chakra-ui/react'
import { Vault } from '@shapeshiftoss/hdwallet-native-vault'
import React, { useEffect } from 'react'
import { RouteComponentProps } from 'react-router'
import { Text } from 'components/Text'
import { useStateIfMounted } from 'hooks/useStateIfMounted/useStateIfMounted'

export const NativeStart = ({ history }: RouteComponentProps) => {
  const [hasLocalWallet, setHasLocalWallet] = useStateIfMounted<boolean>(false)

  useEffect(() => {
    ;(async () => {
      try {
        const localWallets = await Vault.list()
        setHasLocalWallet(localWallets.length > 0)
      } catch (e) {
        console.error('WalletProvider:NativeWallet:Start - Cannnot enumerate Vault', e)
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
        <Stack my={6} spacing={4}>
          <Button
            variant='ghost-filled'
            colorScheme='blue'
            w='full'
            h='auto'
            px={6}
            py={4}
            justifyContent='space-between'
            rightIcon={<ArrowForwardIcon />}
            onClick={() => history.push('/native/import')}
          >
            <Text translation={'walletProvider.shapeShift.start.import'} />
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
            onClick={() => history.push('/native/create')}
          >
            <Text translation={'walletProvider.shapeShift.start.create'} />
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
            disabled={!hasLocalWallet}
            onClick={() => history.push('/native/load')}
          >
            <Text translation={'walletProvider.shapeShift.start.load'} />
          </Button>
        </Stack>
      </ModalBody>
    </>
  )
}
