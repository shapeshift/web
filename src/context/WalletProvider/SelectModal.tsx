import { Button, ModalBody, ModalHeader, Stack, Text } from '@chakra-ui/react'
import { RawText } from 'components/Text'

import { SUPPORTED_WALLETS } from './config'
import { IWalletContext } from './WalletProvider'

export const SelectModal = ({ connect }: { connect: IWalletContext['connect'] }) => {
  return (
    <>
      <ModalHeader>Connect a wallet</ModalHeader>
      <ModalBody>
        <RawText mb={6} color='gray.500'>
          By connecting a wallet, you agree to ShapeShifts’ Terms of Service and acknowledge that
          you have read and understand the ShapeShift disclaimer.
        </RawText>
        <Stack mb={6}>
          {Object.keys(SUPPORTED_WALLETS).map(key => {
            const option = SUPPORTED_WALLETS[key]
            const Icon = option.icon
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
                  <Text fontWeight='semibold'>{option.name}</Text>
                  <Icon height='auto' w='45px' />
                </Button>
              </>
            )
          })}
        </Stack>
      </ModalBody>
    </>
  )
}
