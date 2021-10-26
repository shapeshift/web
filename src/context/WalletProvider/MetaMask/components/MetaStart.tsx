import { ArrowForwardIcon } from '@chakra-ui/icons'
import { Button, ModalBody, ModalHeader, Stack } from '@chakra-ui/react'
import React from 'react'
import { RouteComponentProps } from 'react-router-dom'

import { Text } from '../../../../components/Text'
import { ActionTypes } from '../../WalletProvider'

export interface MetaSetupProps
  extends RouteComponentProps<
    {},
    any // history
  > {
  dispatch: React.Dispatch<ActionTypes>
}

export const MetaStart = ({ history }: MetaSetupProps) => {
  const success = () => {
    history.push('/metamask/success')
  }

  return (
    <>
      <ModalHeader>
        <Text translation={'walletProvider.metaMask.header'} />
      </ModalHeader>
      <ModalBody>
        <Text mb={4} color='gray.500' translation={'walletProvider.metaMask.header'} />
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
            onClick={() => success()}
          >
            <Text translation={'walletProvider.metaMask.connectButton'} />
          </Button>
        </Stack>
      </ModalBody>
    </>
  )
}
