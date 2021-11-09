import { ModalBody, ModalHeader, Spinner } from '@chakra-ui/react'
import { Card } from 'components/Card/Card'
import { Text } from 'components/Text'

import { usePortisSuccess } from '../hooks/usePortisSuccess/usePortisSuccess'

export const PortisSuccess = () => {
  const { isSuccessful } = usePortisSuccess()

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
