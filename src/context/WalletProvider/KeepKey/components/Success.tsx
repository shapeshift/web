import { ModalBody, ModalHeader } from '@chakra-ui/react'

import { Card } from '../../../../components/Card/Card'
import { Text } from '../../../../components/Text'

export const KeepKeySuccess = () => {
  const isSuccessful = true

  return (
    <>
      <ModalHeader>
        <Text translation={'walletProvider.shapeShift.nativeSuccess.header'} />
      </ModalHeader>
      <ModalBody>
        <Card mb={4}>
          <Card.Body fontSize='sm'>
            {isSuccessful && (
              <Text translation={'walletProvider.shapeShift.nativeSuccess.success'} />
            )}
          </Card.Body>
        </Card>
      </ModalBody>
    </>
  )
}
