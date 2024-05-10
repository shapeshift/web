import { Button, ModalBody, ModalHeader, SimpleGrid, Tag } from '@chakra-ui/react'
import * as bip39 from 'bip39'
import range from 'lodash/range'
import shuffle from 'lodash/shuffle'
import slice from 'lodash/slice'
import uniq from 'lodash/uniq'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { RawText, Text } from 'components/Text'

import { addWallet } from '../mobileMessageHandlers'
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

type RevokableWordProps = {
  index: number
  invalidTries: number[]
  word: string
  addRevoker: (revoker: () => void) => void
  onClick: (index: number) => void
}

const RevokableWord = ({ index, invalidTries, word, addRevoker, onClick }: RevokableWordProps) => {
  const handleClick = useCallback(() => onClick(index), [index, onClick])
  const isDisabled = useMemo(() => invalidTries.includes(index), [index, invalidTries])
  return revocable(
    <Button
      key={index}
      flex='1'
      minW='30%'
      variant='ghost-filled'
      colorScheme={isDisabled ? 'gray' : 'blue'}
      isDisabled={isDisabled}
      onClick={handleClick}
    >
      {word}
    </Button>,
    addRevoker,
  )
}

export const MobileCreateTest = ({ history, location }: MobileSetupProps) => {
  const translate = useTranslate()
  const [testState, setTestState] = useState<TestState | null>(null)
  const [invalidTries, setInvalidTries] = useState<number[]>([])
  const [testCount, setTestCount] = useState<number>(0)
  const shuffledNumbers = useMemo(() => slice(shuffle(range(12)), 0, TEST_COUNT_REQUIRED), [])
  const revoker = useMemo(() => new (Revocable(class {}))(), [])

  const { vault } = location.state

  const shuffleMnemonic = useCallback(() => {
    if (testCount >= TEST_COUNT_REQUIRED || !vault) return
    try {
      const words = vault.getWords() ?? []
      let randomWords = uniq(bip39.generateMnemonic(256).split(' ')) as string[]

      const targetWordIndex = shuffledNumbers[testCount]
      const targetWord = words[targetWordIndex] ?? ''
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
      console.log(e)
    }
  }, [revoker, shuffledNumbers, testCount, vault])

  useEffect(() => shuffleMnemonic(), [shuffleMnemonic])

  useEffect(() => {
    // If we've passed the required number of tests, then we can proceed
    if (testCount >= TEST_COUNT_REQUIRED && vault?.label && vault?.mnemonic) {
      ;(async () => {
        if (vault?.label && vault?.mnemonic) {
          const newWallet = await addWallet({ label: vault.label, mnemonic: vault.mnemonic })
          history.replace('/mobile/success', { vault: newWallet! })
        }
      })()

      return () => {
        // Make sure the component is completely unmounted before we revoke the mnemonic
        setTimeout(() => revoker.revoke(), 250)
      }
    }
  }, [testCount, history, vault, revoker])

  const handleClick = useCallback(
    (index: number) => {
      if (index === testState?.correctAnswerIndex) {
        setInvalidTries([])
        setTestCount(testCount + 1)
      } else {
        setInvalidTries([...invalidTries, index])
      }
    },
    [invalidTries, testCount, testState?.correctAnswerIndex],
  )

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
        <SimpleGrid columns={3} spacing={2} mt={12} mb={6}>
          {vault &&
            testState &&
            testState.randomWords.map((word: string, index: number) => (
              <RevokableWord
                index={index}
                invalidTries={invalidTries}
                word={word}
                addRevoker={revoker.addRevoker.bind(revoker)}
                onClick={handleClick}
              />
            ))}
        </SimpleGrid>
      </ModalBody>
    </>
  )
}
