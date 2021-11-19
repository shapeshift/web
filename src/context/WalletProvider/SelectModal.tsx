import { Button, Center, Flex, ModalBody, ModalHeader, Stack, Tag } from '@chakra-ui/react'
import { RawText, Text } from 'components/Text'

import { KeyManager, SUPPORTED_WALLETS } from './config'
import { useWallet } from './WalletProvider'

export const SelectModal = () => {
  const {
    state: { adapters, walletInfo },
    connect
  } = useWallet()

  return (
    <>
      <ModalHeader>
        <Text translation={'walletProvider.selectModal.header'} />
      </ModalHeader>
      <ModalBody>
        <Text mb={6} color='gray.500' translation={'walletProvider.selectModal.body'} />
        <Stack mb={6}>
          {adapters &&
            // TODO: KeepKey adapter may fail due to the USB interface being in use by another tab
            // So not all of the supported wallets will have an initialized adapter
            Object.values(KeyManager).map(key => {
              const option = SUPPORTED_WALLETS[key]
              const Icon = option.icon
              return (
                <Button
                  key={key}
                  w='full'
                  size='lg'
                  py={8}
                  justifyContent='space-between'
                  onClick={() => connect(key)}
                >
                  <Flex alignItems='center'>
                    <RawText fontWeight='semibold'>{option.name}</RawText>
                    {walletInfo?.name === option.name && (
                      <Tag colorScheme='green' ml={2}>
                        <Text translation='common.connected' />
                      </Tag>
                    )}
                  </Flex>
                  <Center>
                    <Icon height='30px' w='auto' />
                  </Center>
                </Button>
              )
            })}
        </Stack>
      </ModalBody>
    </>
  )
}
