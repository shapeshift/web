import * as native from '@shapeshiftoss/hdwallet-native'
import * as bip39 from 'bip39'
import range from 'lodash/range'
import shuffle from 'lodash/shuffle'
import slice from 'lodash/slice'
import { useCallback, useMemo, useState } from 'react'
import { useEffect } from 'react'
import { useHistory, useLocation } from 'react-router-dom'
import { LocationState } from 'context/WalletProvider/NativeWallet/types'

const Revocable = native.crypto.Isolation.Engines.Default.Revocable
const revocable = native.crypto.Isolation.Engines.Default.revocable

const TEST_COUNT_REQUIRED = 3

type Tuples = [number, string][]

export const useNativeTestPhrase = () => {
  const { state } = useLocation<LocationState>()
  const { push } = useHistory()
  const [shuffledWords, setShuffledWords] = useState<Tuples>([])
  const [shuffledRandomWords, setShuffledRandomWords] = useState<string[]>([])
  const [invalidTries, setInvalidTries] = useState<string[]>([])
  const [testWord, setTestWord] = useState<string>('')
  const [testCount, setTestCount] = useState<number>(1)
  const [invalid, setInvalid] = useState<boolean>(false)
  const shuffledNumbers = useMemo(() => slice(shuffle(range(12)), 0, TEST_COUNT_REQUIRED), [])
  const revoker = useMemo(() => new (Revocable(class {}))(), [])

  const decrypt = useCallback(async () => {
    if (state.vault) {
      try {
        const mnemonic = await state.vault.unwrap().get('#mnemonic')
        const words = mnemonic.split(' ')
        let randomWords = revocable(
          bip39.generateMnemonic().split(' '),
          revoker.addRevoker.bind(revoker)
        )
        const shuffledTuples: Tuples = revocable([], revoker.addRevoker.bind(revoker))
        for (let i of shuffledNumbers) {
          shuffledTuples.push(revocable([i + 1, words[i]], revoker.addRevoker.bind(revoker)))
          // Add the words we want to check to the random words for the user to click on
          randomWords.push(words[i])
        }
        setShuffledWords(shuffledTuples)
        setShuffledRandomWords(shuffle(randomWords))
      } catch (error) {
        state.error = { message: 'Error creating wallet' }
      }
    }
  }, [state, shuffledNumbers, revoker])

  useEffect(() => {
    decrypt()
  }, [decrypt])

  const handleNext = () => {
    setTestWord('')
    setInvalidTries([])
    if (testCount >= TEST_COUNT_REQUIRED) {
      setShuffledWords([])
      state.vault?.seal()
      revoker.revoke()
      push('/native/success', { vault: state.vault })
    } else if (shuffledWords[testCount - 1][1] === testWord) {
      setTestCount(Math.min(testCount + 1, TEST_COUNT_REQUIRED))
      setInvalid(false)
    } else {
      setInvalidTries([...invalidTries, testWord])
      setInvalid(true)
    }
  }

  return {
    shuffledRandomWords,
    handleNext,
    invalid,
    shuffledWords,
    invalidTries,
    testCount,
    setTestWord,
    testWord,
    revoker
  }
}
