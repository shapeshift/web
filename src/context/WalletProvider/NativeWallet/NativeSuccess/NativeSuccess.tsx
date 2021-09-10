import { ModalBody, ModalHeader, Spinner } from '@chakra-ui/react'
import { NativeAdapter } from '@shapeshiftoss/hdwallet-native'
import { useEffect, useState } from 'react'
import { Card } from 'components/Card/Card'
import { Text } from 'components/Text'
import { useLocalStorage } from 'hooks/useLocalStorage/useLocalStorage'

import { useNativeSuccess } from './hooks/useNativeSuccess/useNativeSuccess'
import { SUPPORTED_WALLETS } from '../../config'
import { useWallet, WalletActions } from '../../WalletProvider'
import { NativeSetupProps } from '../setup'

export const NativeSuccess = ({ location }: NativeSetupProps) => {
  const { isSuccessful } = useNativeSuccess({ location })

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
