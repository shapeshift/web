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
import { Text } from 'components/Text'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { FaEye } from 'react-icons/fa'

import { NativeSetupProps } from './setup'

export const NativeSeed = ({ history, location }: NativeSetupProps) => {
  const [revealed, setRevealed] = useState<boolean>(false)
  const revealedOnce = useRef<boolean>(false)
  const [, setIsGenerating] = useState(true)
  const [isRevoked, setIsRevoked] = useState(false)

  const handleShow = () => {
    revealedOnce.current = true
    setRevealed(!revealed)
  }

  const revocableSeed = useMemo(
    () =>
      Proxy.revocable({} as { seed?: string }, {
        get: (target, name) => (name === 'seed' ? target.seed : undefined),
        set: (target, name, value) => {
          if (name === 'seed') {
            Object.defineProperty(target, name, {
              enumerable: false,
              configurable: false,
              writable: false,
              value
            })

            return true
          }
          return false
        }
      }),
    []
  )

  const generate = useCallback(async () => {
    if (location.state.encryptedWallet && !location.state.encryptedWallet.encryptedWallet) {
      try {
        await location.state.encryptedWallet.createWallet()
        location.state.error = undefined
        revocableSeed.proxy.seed = await location.state.encryptedWallet.decrypt()
      } catch (error) {
        console.error('Error creating wallet', error)
        location.state.error = { message: 'Error creating wallet' }
      }

      setIsGenerating(false)
    }
  }, [location.state, revocableSeed])

  useEffect(() => {
    generate().catch()
  }, [generate])

  return (
    <>
      <ModalHeader>
        <Text translation={'wProvider.shapeShift.nSeed.header'} />
      </ModalHeader>
      <ModalBody>
        <Text translation={'wProvider.shapeShift.nSeed.body'} />
        {location?.state?.error && (
          <Alert status='error'>
            <AlertIcon />
            <AlertDescription>{location.state.error.message}</AlertDescription>
          </Alert>
        )}
        <Wrap mt={12} mb={6}>
          {!isRevoked &&
            revocableSeed.proxy.seed?.split(' ')?.map((word, index) => (
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
              revocableSeed.revoke()
              history.push('/native/seed-test', { encryptedWallet: location.state.encryptedWallet })
            }}
          >
            <Text translation={'wProvider.shapeShift.nSeed.button'} />
          </Button>
        )}
      </ModalFooter>
    </>
  )
}
