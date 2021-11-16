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
import * as native from '@shapeshiftoss/hdwallet-native'
import { useMemo, useRef, useState } from 'react'
import { FaEye } from 'react-icons/fa'
import { Text } from 'components/Text'

import { NativeSetupProps } from '../../types'

const Revocable = native.crypto.Isolation.Engines.Default.Revocable
const revocable = native.crypto.Isolation.Engines.Default.revocable

export const NativeSeed = ({ history, location }: NativeSetupProps) => {
  const [revealed, setRevealed] = useState<boolean>(false)
  const revealedOnce = useRef<boolean>(false)
  const handleShow = () => {
    revealedOnce.current = true
    setRevealed(!revealed)
  }

  const revoker = useMemo(() => new (Revocable(class {}))(), [])

  const vault = location.state.vault!
  const words = useMemo(() => {
    try {
      return vault
        .unwrap()
        .get('#mnemonic')
        .split(' ')
        .map((word: string, index: number) =>
          revocable(
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
            </Tag>,
            revoker.addRevoker.bind(revocable)
          )
        )
    } catch (e) {
      console.error('failed to get seed:', e)
      return []
    }
  }, [vault, revealed, revoker])

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
          {words}
        </Wrap>
      </ModalBody>
      <ModalFooter justifyContent='space-between'>
        <Button colorScheme='blue' onClick={handleShow} size='lg' leftIcon={<FaEye />}>
          {`${revealed ? 'Hide' : 'Show'}`} Words
        </Button>
        {revealedOnce.current && (
          <Button
            colorScheme='blue'
            size='lg'
            onClick={() => {
              revoker.revoke()
              history.push('/native/seed-test', { vault: location.state.vault })
            }}
          >
            <Text translation={'walletProvider.shapeShift.nativeSeed.button'} />
          </Button>
        )}
      </ModalFooter>
    </>
  )
}
