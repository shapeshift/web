import { EncryptedWallet } from '@shapeshiftoss/hdwallet-native/dist/crypto'
import * as bip39 from 'bip39'
import range from 'lodash/range'
import shuffle from 'lodash/shuffle'
import slice from 'lodash/slice'
import { useCallback, useMemo, useState } from 'react'
import { useEffect } from 'react'
import { useHistory, useLocation } from 'react-router-dom'

const TEST_COUNT_REQUIRED = 3

type Tuples = [number, string][]

export const useNativeTestPhrase = () => {
  const { state } = useLocation<{
    encryptedWallet?: EncryptedWallet
    error?: {
      message: string
    }
  }>()

  const { push } = useHistory()
  const [shuffledWords, setShuffledWords] = useState<Tuples>([])
  const [shuffledRandomWords, setShuffledRandomWords] = useState<string[]>([])
  const [testWord, setTestWord] = useState<string>('')
  const [testCount, setTestCount] = useState<number>(1)
  const [invalid, setInvalid] = useState<boolean>(false)
  const shuffledNumbers = useMemo(() => slice(shuffle(range(12)), 0, TEST_COUNT_REQUIRED), [])

  const decrypt = useCallback(async () => {
    if (state.encryptedWallet?.encryptedWallet) {
      try {
        const mnemonic = await state.encryptedWallet.decrypt()
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
        state.error = { message: 'Error creating wallet' }
      }
    }
  }, [state, shuffledNumbers])

  useEffect(() => {
    decrypt()
  }, [decrypt])

  const handleNext = () => {
    setTestWord('')
    if (testCount >= TEST_COUNT_REQUIRED) {
      setShuffledWords([])
      push('/native/success', { encryptedWallet: state.encryptedWallet })
    } else if (shuffledWords[testCount - 1][1] === testWord) {
      setTestCount(Math.min(testCount + 1, TEST_COUNT_REQUIRED))
      setInvalid(false)
    } else {
      setInvalid(true)
    }
  }

  return {
    shuffledRandomWords,
    handleNext,
    invalid,
    shuffledWords,
    testCount,
    setTestWord,
    testWord
  }
}
