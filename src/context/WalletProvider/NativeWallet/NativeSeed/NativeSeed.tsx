import {
  Alert,
  AlertDescription,
  AlertIcon,
  Button,
  Code,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Tag,
  Wrap
} from '@chakra-ui/react'
import { useRef, useState } from 'react'
import { FaEye } from 'react-icons/fa'
import { Text } from 'components/Text'

import { NativeSetupProps } from '../setup'
import { useRevocableSeed } from './hooks/useRevocableSeed/useRevocableSeed'

export const NativeSeed = ({ history, location }: NativeSetupProps) => {
  const [revealed, setRevealed] = useState<boolean>(false)
  const revealedOnce = useRef<boolean>(false)
  const [isRevoked, setIsRevoked] = useState(false)
  const { getSeed, revoke } = useRevocableSeed(location.state.encryptedWallet)
  const handleShow = () => {
    revealedOnce.current = true
    setRevealed(!revealed)
  }

  return (
    <>
      <ModalHeader>
        <Text translation={'walletProvider.shapeShift.nativeSeed.header'} />
      </ModalHeader>
      <ModalBody>
        <Text translation={'walletProvider.shapeShift.nativeSeed.body'} />
        {location?.state?.error && (
          <Alert status='error'>
            <AlertIcon />
            <AlertDescription>{location.state.error.message}</AlertDescription>
          </Alert>
        )}
        <Wrap mt={12} mb={6}>
          {!isRevoked &&
            getSeed()
              ?.split(' ')
              ?.map((word, index) => (
                <Tag
                  p={2}
                  flexBasis='31%'
                  justifyContent='flex-start'
                  fontSize='md'
                  key={word}
                  colorScheme='blue'
                >
                  <Code mr={2}>{index + 1}</Code>
                  {revealed ? word : '•••••••'}
                </Tag>
              ))}
        </Wrap>
      </ModalBody>
      <ModalFooter justifyContent='space-between'>
        <Button colorScheme='blue' onClick={handleShow} leftIcon={<FaEye />}>
          {`${revealed ? 'Hide' : 'Show'}`} Words
        </Button>
        {revealedOnce.current && (
          <Button
            colorScheme='blue'
            size='lg'
            onClick={() => {
              setIsRevoked(true)
              revoke()
              history.push('/native/seed-test', { encryptedWallet: location.state.encryptedWallet })
            }}
          >
            <Text translation={'walletProvider.shapeShift.nativeSeed.button'} />
          </Button>
        )}
      </ModalFooter>
    </>
  )
}
