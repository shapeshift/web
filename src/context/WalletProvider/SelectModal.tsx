import { Button, Image, ModalBody, ModalHeader, Stack } from '@chakra-ui/react'
import { RawText, Text } from 'components/Text'

import { SUPPORTED_WALLETS } from './config'

export const SelectModal = ({ connect }: { connect: (adapter: string) => Promise<void> }) => {
  return (
    <>
      <ModalHeader>
        <Text translation={'walletProvider.selectModal.header'} />
      </ModalHeader>
      <ModalBody>
        <Text mb={6} color='gray.500' translation={'walletProvider.selectModal.body'} />
        <Stack mb={6}>
          {Object.keys(SUPPORTED_WALLETS).map(key => {
            const option = SUPPORTED_WALLETS[key]
            return (
              <>
                <Button
                  variant='ghost-filled'
                  colorScheme='blue'
                  key={key}
                  w='full'
                  h='auto'
                  px={6}
                  py={4}
                  justifyContent='space-between'
                  onClick={() => connect(key)}
                >
                  <RawText fontWeight='semibold'>{option.name}</RawText>
                  <Image maxH={10} maxW={20} src={option.icon} />
                </Button>
              </>
            )
          })}
        </Stack>
      </ModalBody>
    </>
  )
}
