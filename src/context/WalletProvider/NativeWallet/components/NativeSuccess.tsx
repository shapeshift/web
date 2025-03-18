import { Box, ModalBody, ModalHeader } from '@chakra-ui/react'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'

import { useNativeSuccess } from '../hooks/useNativeSuccess'
import type { NativeSetupProps } from '../types'

import { Text } from '@/components/Text'
import { reactQueries } from '@/react-queries'

export const NativeSuccess = ({ location }: NativeSetupProps) => {
  const queryClient = useQueryClient()
  const { isSuccessful } = useNativeSuccess({ vault: location.state.vault })

  useEffect(() => {
    queryClient.invalidateQueries({
      queryKey: reactQueries.common.hdwalletNativeVaultsList().queryKey,
    })
    queryClient.invalidateQueries({
      queryKey: ['native-create-vault'],
      exact: false,
      refetchType: 'all',
    })
    queryClient.invalidateQueries({
      queryKey: ['native-create-words'],
      exact: false,
      refetchType: 'all',
    })
  }, [queryClient])

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
