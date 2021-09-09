import { Button, ModalBody, ModalFooter, ModalHeader, Tag, Wrap } from '@chakra-ui/react'
import * as bip39 from 'bip39'
import range from 'lodash/range'
import shuffle from 'lodash/shuffle'
import slice from 'lodash/slice'
import { useCallback, useMemo, useState } from 'react'
import { useEffect } from 'react'
import { RawText, Text } from 'components/Text'

import { NativeSetupProps } from './setup'

const ordinalSuffix = (n: number) => {
  return ['st', 'nd', 'rd'][((((n + 90) % 100) - 10) % 10) - 1] || 'th'
}

const TEST_COUNT_REQUIRED = 3

type Tuples = [number, string][]
export const NativeTestPhrase = ({ history, location }: NativeSetupProps) => {
  const [shuffledWords, setShuffledWords] = useState<Tuples>([])
  const [shuffledRandomWords, setShuffledRandomWords] = useState<string[]>([])
  const [testWord, setTestWord] = useState<string>('')
  const [testCount, setTestCount] = useState<number>(1)
  const [invalid, setInvalid] = useState<boolean>(false)
  const shuffledNumbers = useMemo(() => slice(shuffle(range(12)), 0, TEST_COUNT_REQUIRED), [])

  const decrypt = useCallback(async () => {
    if (location.state.encryptedWallet?.encryptedWallet) {
      try {
        const mnemonic = await location.state.encryptedWallet.decrypt()
        const words = mnemonic.split(' ')
        let randomWords = bip39.generateMnemonic().split(' ')
        const shuffledTuples: Tuples = []
        for (let i of shuffledNumbers) {
          shuffledTuples.push([i + 1, words[i]])
          // Add the words we want to check to the random words for the user to click on
          randomWords.push(words[i])
        }
        setShuffledWords(shuffledTuples)
        setShuffledRandomWords(shuffle(randomWords))
      } catch (error) {
        location.state.error = { message: 'Error creating wallet' }
      }
    }
  }, [location.state, shuffledNumbers])

  useEffect(() => {
    decrypt().catch()
  }, [decrypt])

  const handleNext = () => {
    setTestWord('')
    if (testCount >= TEST_COUNT_REQUIRED) {
      setShuffledWords([])
      history.push('/native/success', { encryptedWallet: location.state.encryptedWallet })
    } else if (shuffledWords[testCount - 1][1] === testWord) {
      setTestCount(Math.min(testCount + 1, TEST_COUNT_REQUIRED))
      setInvalid(false)
    } else {
      setInvalid(true)
    }
  }

  return !shuffledWords.length ? null : (
    <>
      <ModalHeader>
        <Text translation={'walletProvider.shapeShift.nativeTestPhrase.header'} />
      </ModalHeader>
      <ModalBody>
        <RawText>
          <Text translation={'walletProvider.shapeShift.nativeTestPhrase.body1'} />{' '}
          <Tag colorScheme='green'>
            {shuffledWords[testCount - 1][0]}
            {ordinalSuffix(shuffledWords[testCount - 1][0])}{' '}
            <Text translation={'walletPrivder.shapeShift.nativeTestPhrase.body2'} />
          </Tag>{' '}
          <Text translation={'walletProvider.shapeShift.nativeTestPhrase.body3'} />
        </RawText>
        <Wrap mt={12} mb={6}>
          {shuffledRandomWords &&
            shuffledRandomWords.map(word => (
              <Button
                key={word}
                flex='1'
                minW='30%'
                variant='ghost-filled'
                colorScheme={invalid ? 'red' : 'blue'}
                onClick={() => setTestWord(word)}
                isActive={testWord === word}
              >
                {word}
              </Button>
            ))}
        </Wrap>
      </ModalBody>
      <ModalFooter>
        <Button colorScheme='blue' size='lg' isDisabled={!testWord} onClick={handleNext}>
          <Text translation={'walletProvider.shapeShift.nativeTestPhrase.button'} />
        </Button>
      </ModalFooter>
    </>
  )
}
