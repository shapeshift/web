import { Box, ModalBody, ModalHeader } from '@chakra-ui/react'
import { useLocation } from 'react-router-dom'
import { Text } from 'components/Text'

import { useNativeSuccess } from '../hooks/useNativeSuccess'

export const NativeSuccess = () => {
  const location = useLocation()
  const { vault }: any = location.state
  const { isSuccessful } = useNativeSuccess({ vault: vault })

  return (
    <>
      <ModalHeader>
        <Text translation={'walletProvider.shapeShift.success.header'} />
      </ModalHeader>
      <ModalBody>
        <Box color='gray.500'>
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
