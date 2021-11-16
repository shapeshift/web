import { ModalBody, ModalHeader, Spinner } from '@chakra-ui/react'
import { Card } from 'components/Card/Card'
import { Text } from 'components/Text'

import { useNativeSuccess } from '../../hooks/useNativeSuccess/useNativeSuccess'
import { NativeSetupProps } from '../../types'

export const NativeSuccess = ({ location }: NativeSetupProps) => {
  const { isSuccessful } = useNativeSuccess({ vault: location.state.vault })

  return (
    <>
      <ModalHeader>
        <Text translation={'walletProvider.shapeShift.nativeSuccess.header'} />
      </ModalHeader>
      <ModalBody>
        <Card mb={4}>
          <Card.Body fontSize='sm'>
            {isSuccessful === true ? (
              <Text translation={'walletProvider.shapeShift.nativeSuccess.success'} />
            ) : isSuccessful === false ? (
              <Text translation={'walletProvider.shapeShift.nativeSuccess.error'} />
            ) : (
              <Spinner />
            )}
          </Card.Body>
        </Card>
      </ModalBody>
    </>
  )
}
