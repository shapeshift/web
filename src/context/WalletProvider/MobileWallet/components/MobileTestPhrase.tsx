import { Button, ModalBody, ModalHeader, Tag, Wrap } from '@chakra-ui/react'
import * as bip39 from 'bip39'
import range from 'lodash/range'
import shuffle from 'lodash/shuffle'
import slice from 'lodash/slice'
import uniq from 'lodash/uniq'
import { useCallback, useEffect, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { RawText, Text } from 'components/Text'

import { mobileLogger } from '../config'
import { Revocable, revocable } from '../RevocableWallet'
import type { MobileSetupProps } from '../types'

const TEST_COUNT_REQUIRED = 3

const ordinalSuffix = (n: number) => {
  return ['st', 'nd', 'rd'][((((n + 90) % 100) - 10) % 10) - 1] || 'th'
}

type TestState = {
  targetWordIndex: number
  randomWords: string[]
  correctAnswerIndex: number
}

const moduleLogger = mobileLogger.child({
  namespace: ['components', 'MobileTestPhrase'],
})

export const MobileTestPhrase = ({ history, location }: MobileSetupProps) => {
  const translate = useTranslate()
  const [testState, setTestState] = useState<TestState | null>(null)
  const [invalidTries, setInvalidTries] = useState<number[]>([])
  const [testCount, setTestCount] = useState<number>(0)
  const [shuffledNumbers] = useState(slice(shuffle(range(12)), 0, TEST_COUNT_REQUIRED))
  const [, setError] = useState<string | null>(null)
  const [revoker] = useState(new (Revocable(class {}))())

  const { vault } = location.state

  const shuffleMnemonic = useCallback(async () => {
    moduleLogger.info('shuffleMnemonic')
    if (testCount >= TEST_COUNT_REQUIRED || !vault) return
    try {
      const words = vault.getWords() ?? []
      moduleLogger.info({ words }, 'words')
      let randomWords = uniq(bip39.generateMnemonic(256).split(' '))
      moduleLogger.info({ randomWords, shuffledNumbers }, 'randomWords')

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
      moduleLogger.error(e, 'shuffleMnemonic')
      setError('walletProvider.shapeShift.create.error')
    }
  }, [revoker, shuffledNumbers, testCount, vault])

  useEffect(() => {
    shuffleMnemonic().catch(() => setError('walletProvider.shapeShift.create.error'))
  }, [shuffleMnemonic])

  useEffect(() => {
    // If we've passed the required number of tests, then we can proceed
    if (testCount >= TEST_COUNT_REQUIRED) {
      history.replace('/mobile/success', { vault })
      return () => {
        // Make sure the component is completely unmounted before we revoke the mnemonic
        setTimeout(() => revoker.revoke(), 250)
      }
    }
  }, [testCount, history, vault, revoker])

  const handleClick = (index: number) => {
    if (index === testState?.correctAnswerIndex) {
      setInvalidTries([])
      setTestCount(testCount + 1)
    } else {
      setInvalidTries([...invalidTries, index])
    }
  }

  moduleLogger.info({ testState }, 'TestState')

  return !testState ? null : (
    <>
      <ModalHeader>
        <Text translation={'walletProvider.shapeShift.testPhrase.header'} />
      </ModalHeader>
      <ModalBody>
        <RawText>
          <Text
            as='span'
            color='gray.500'
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
            color='gray.500'
            translation={'walletProvider.shapeShift.testPhrase.body3'}
          />
        </RawText>
        <Wrap mt={12} mb={6}>
          {vault &&
            testState &&
            testState.randomWords.map((word: string, index: number) =>
              revocable(
                <Button
                  key={index}
                  flex='1'
                  minW='30%'
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
      </ModalBody>
    </>
  )
}
