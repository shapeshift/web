import { CheckCircleIcon } from '@chakra-ui/icons'
import { ModalBody } from '@chakra-ui/react'
import { ReactNode } from 'react'
import { useEffect } from 'react'
import { useWallet, WalletActions } from 'context/WalletProvider/WalletProvider'

import { Text } from '../../../components/Text'

export type SuccessModalProps = {
  headerText: string
  bodyText: string
  children?: ReactNode
}

export const SuccessModal: React.FC<SuccessModalProps> = props => {
  const isSuccessful = true
  const { dispatch } = useWallet()

  useEffect(() => {
    // close modal after 2 seconds
    const timer = setTimeout(() => {
      dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: false })
    }, 2000)
    return () => clearTimeout(timer)
  }, [dispatch])

  return (
    <>
      <ModalBody textAlign='center' pb={8}>
        <CheckCircleIcon color='green.500' boxSize={20} mb={6} />
        <Text fontSize='lg' fontWeight='bold' translation={props.headerText} />
        {isSuccessful && <Text color='gray.500' translation={props.bodyText} />}
      </ModalBody>
    </>
  )
}
