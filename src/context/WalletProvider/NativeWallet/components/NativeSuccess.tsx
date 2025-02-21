import { Box, ModalBody, ModalHeader } from '@chakra-ui/react'
import { useQueryClient } from '@tanstack/react-query'
import { reactQueries } from 'react-queries'

import { useNativeSuccess } from '../hooks/useNativeSuccess'
import type { NativeSetupProps } from '../types'

import { Text } from '@/components/Text'

export const NativeSuccess = ({ location }: NativeSetupProps) => {
  const queryClient = useQueryClient()
  const { isSuccessful } = useNativeSuccess({ vault: location.state.vault })

  queryClient.invalidateQueries({
    queryKey: reactQueries.common.hdwalletNativeVaultsList().queryKey,
  })

  return (
    <>
      <ModalHeader>
        <Text translation={'walletProvider.shapeShift.success.header'} />
      </ModalHeader>
      <ModalBody>
        <Box color='text.subtle'>
          {isSuccessful === true ? (
            <Text translation={'walletProvider.shapeShift.success.success'} />
          ) : isSuccessful === false ? (
            <Text translation={'walletProvider.shapeShift.success.error'} />
          ) : (
            <Text translation={'walletProvider.shapeShift.success.encryptingWallet'} />
          )}
        </Box>
      </ModalBody>
    </>
  )
}
