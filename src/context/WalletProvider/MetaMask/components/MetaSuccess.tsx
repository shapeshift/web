import { ModalBody, ModalHeader, Spinner } from '@chakra-ui/react'
import { useEffect } from 'react'
import { Card } from 'components/Card/Card'
import { Text } from 'components/Text'
import { useWallet, WalletActions } from 'context/WalletProvider/WalletProvider'

import { useMetaSuccess } from '../hooks/useMetaSuccess/useMetaSuccess'

export const MetaSuccess = () => {
  const { isSuccessful } = useMetaSuccess()
  const { dispatch } = useWallet()
  useEffect(() => {
    dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: false })
  }, [dispatch, isSuccessful])
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
