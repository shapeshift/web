import { Box, ModalBody, ModalHeader } from '@chakra-ui/react'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useLocation } from 'react-router'

import { useNativeSuccess } from '../hooks/useNativeSuccess'

import { Text } from '@/components/Text'
import { reactQueries } from '@/react-queries'

export const NativeSuccess = () => {
  const location = useLocation()
  const queryClient = useQueryClient()
  const { isSuccessful } = useNativeSuccess({ vault: location.state.vault })

  useEffect(() => {
    queryClient.resetQueries({
      queryKey: reactQueries.common.hdwalletNativeVaultsList().queryKey,
    })
    queryClient.resetQueries({
      queryKey: ['native-create-vault'],
      exact: false,
    })
    queryClient.resetQueries({
      queryKey: ['native-create-words'],
      exact: false,
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
