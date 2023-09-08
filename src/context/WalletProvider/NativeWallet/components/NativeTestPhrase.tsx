import { Box, Button, Checkbox, Divider, ModalBody, ModalHeader, Tag, Wrap } from '@chakra-ui/react'
import * as native from '@shapeshiftoss/hdwallet-native'
import * as bip39 from 'bip39'
import range from 'lodash/range'
import shuffle from 'lodash/shuffle'
import slice from 'lodash/slice'
import uniq from 'lodash/uniq'
import { useCallback, useEffect, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { RawText, Text } from 'components/Text'

import type { NativeSetupProps } from '../types'

const Revocable = native.crypto.Isolation.Engines.Default.Revocable
const revocable = native.crypto.Isolation.Engines.Default.revocable

const TEST_COUNT_REQUIRED = 3

export const ordinalSuffix = (n: number) => {
  return ['st', 'nd', 'rd'][((((n + 90) % 100) - 10) % 10) - 1] || 'th'
}

type TestState = {
  targetWordIndex: number
  randomWords: string[]
  correctAnswerIndex: number
}

export const NativeTestPhrase = ({ history, location }: NativeSetupProps) => {
  const translate = useTranslate()
  const [testState, setTestState] = useState<TestState | null>(null)
  const [hasAlreadySaved, setHasAlreadySaved] = useState(false)
  const [invalidTries, setInvalidTries] = useState<number[]>([])
  const [testCount, setTestCount] = useState<number>(0)
  const [revoker] = useState(new (Revocable(class {}))())
  const [shuffledNumbers] = useState(slice(shuffle(range(12)), 0, TEST_COUNT_REQUIRED))
  const [, setError] = useState<string | null>(null)

  const onCheck = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Check the captcha in case the captcha has been validated
    setHasAlreadySaved(e.target.checked)
    return
  }

  const { vault, isLegacyWallet } = location.state

  const shuffleMnemonic = useCallback(async () => {
    if (testCount >= TEST_COUNT_REQUIRED) return
    try {
      const mnemonic = await vault.unwrap().get('#mnemonic')
      const words = mnemonic.split(' ')
      let randomWords = uniq(bip39.generateMnemonic(256).split(' '))

      const targetWordIndex = shuffledNumbers[testCount]
      const targetWord = words[targetWordIndex]
      randomWords = randomWords.filter(x => x !== targetWord).slice(0, 14)
      randomWords.push(targetWord)
      randomWords = shuffle(randomWords)
      const correctAnswerIndex = randomWords.indexOf(targetWord)
      // Should never happen because we literally just added the word to the array
      if (correctAnswerIndex === -1) throw Error("Can't find index of current word in randomWords")

      setTestState(
        revocable(
          {
            targetWordIndex,
            randomWords,
            correctAnswerIndex,
          },
          revoker.addRevoker.bind(revoker),
        ),
      )
    } catch (e) {
      setError('walletProvider.shapeShift.create.error')
    }
  }, [setTestState, shuffledNumbers, vault, revoker, testCount])

  useEffect(() => {
    shuffleMnemonic().catch(() => setError('walletProvider.shapeShift.create.error'))
  }, [shuffleMnemonic])

  useEffect(() => {
    // If we've passed the required number of tests, then we can proceed
    if (testCount >= TEST_COUNT_REQUIRED) {
      vault.seal()
      history.replace('/native/password', { vault })
      return () => {
        // Make sure the component is completely unmounted before we revoke the mnemonic
        setTimeout(() => revoker.revoke(), 250)
      }
    }
  }, [testCount, history, revoker, vault])

  const handleClick = (index: number) => {
    if (index === testState?.correctAnswerIndex) {
      setInvalidTries([])
      setTestCount(testCount + 1)
    } else {
      setInvalidTries([...invalidTries, index])
    }
  }

  return !testState ? null : (
    <>
      <ModalHeader>
        <Text translation={'walletProvider.shapeShift.testPhrase.header'} />
      </ModalHeader>
      <ModalBody>
        <RawText>
          <Text
            as='span'
            color='text.subtle'
            translation={'walletProvider.shapeShift.testPhrase.body'}
          />{' '}
          <Tag colorScheme='green'>
            {translate(
              `walletProvider.shapeShift.testPhrase.${testState.targetWordIndex + 1}${ordinalSuffix(
                testState.targetWordIndex + 1,
              )}`,
            )}
            <Text as='span' ml={1} translation={'walletProvider.shapeShift.testPhrase.body2'} />
          </Tag>{' '}
          <Text
            as='span'
            color='text.subtle'
            translation={'walletProvider.shapeShift.testPhrase.body3'}
          />
        </RawText>
        <Wrap mt={12} mb={6}>
          {testState &&
            testState.randomWords.map((word: string, index: number) =>
              revocable(
                <Button
                  key={index}
                  flexGrow={4}
                  flexBasis='auto'
                  variant='ghost-filled'
                  colorScheme={invalidTries.includes(index) ? 'gray' : 'blue'}
                  isDisabled={invalidTries.includes(index)}
                  onClick={() => handleClick(index)}
                >
                  {word}
                </Button>,
                revoker.addRevoker.bind(revoker),
              ),
            )}
        </Wrap>
        {isLegacyWallet && (
          <Box>
            <Box position='relative' mb={8} mt={10}>
              <Divider />
              <Text
                translation={'common.or'}
                transform='translate(-50%, -50%)'
                left='50%'
                position='absolute'
                color='text.subtle'
              />
            </Box>
            <Checkbox mb={4} spacing={4} onChange={onCheck} isChecked={hasAlreadySaved}>
              <Text
                fontSize='sm'
                translation={'walletProvider.shapeShift.legacy.alreadySavedConfirm'}
              />
            </Checkbox>
            <Button
              colorScheme='blue'
              width='full'
              size='md'
              isDisabled={!hasAlreadySaved}
              data-test='wallet-native-login-skip'
              onClick={() => history.push('/native/password', { vault })}
            >
              <Text translation={'common.skip'} />
            </Button>
          </Box>
        )}
      </ModalBody>
    </>
  )
}
