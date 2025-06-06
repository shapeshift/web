import { ArrowBackIcon } from '@chakra-ui/icons'
import {
  Box,
  Button,
  Checkbox,
  Divider,
  IconButton,
  ModalBody,
  ModalCloseButton,
  ModalHeader,
  Tag,
  Wrap,
} from '@chakra-ui/react'
import { crypto } from '@shapeshiftoss/hdwallet-native'
import * as bip39 from 'bip39'
import range from 'lodash/range'
import shuffle from 'lodash/shuffle'
import slice from 'lodash/slice'
import uniq from 'lodash/uniq'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { useNavigate } from 'react-router-dom'

import type { LocationState } from './BackupPassphraseCommon'
import { BackupPassphraseRoutes } from './BackupPassphraseCommon'

import { SlideTransition } from '@/components/SlideTransition'
import { RawText, Text } from '@/components/Text'
import { useModal } from '@/hooks/useModal/useModal'

const Revocable = crypto.Isolation.Engines.Default.Revocable
const revocable = crypto.Isolation.Engines.Default.revocable

const TEST_COUNT_REQUIRED = 3

const makeOrdinalSuffix = (n: number) => {
  return ['st', 'nd', 'rd'][((((n + 90) % 100) - 10) % 10) - 1] || 'th'
}

const arrowBackIcon = <ArrowBackIcon />

type TestState = {
  targetWordIndex: number
  randomWords: string[]
  correctAnswerIndex: number
}

export const BackupPassphraseTest: React.FC<LocationState> = props => {
  const { revocableWallet } = props
  const translate = useTranslate()
  const navigate = useNavigate()
  const [testState, setTestState] = useState<TestState | null>(null)
  const [testCount, setTestCount] = useState<number>(0)
  const [revoker] = useState(new (Revocable(class {}))())
  const [, setError] = useState<string | null>(null)
  const [hasAlreadySaved, setHasAlreadySaved] = useState(false)
  const { props: backupNativePassphraseProps } = useModal('backupNativePassphrase')
  const preventClose = backupNativePassphraseProps?.preventClose
  const shuffledNumbers = useMemo(() => slice(shuffle(range(12)), 0, TEST_COUNT_REQUIRED), [])

  const shuffleMnemonic = useCallback(() => {
    if (testCount >= TEST_COUNT_REQUIRED) return
    try {
      const words = revocableWallet.getWords()
      if (!words || words.length < 12) {
        return setError('walletProvider.shapeShift.create.error')
      }
      let randomWords = uniq(bip39.generateMnemonic(256).split(' ')) as string[]

      const targetWordIndex = shuffledNumbers[testCount]
      const targetWord = words[targetWordIndex]
      randomWords = randomWords.filter(x => x !== targetWord).slice(0, 3)

      if (!targetWord) return setError('walletProvider.shapeShift.create.error')
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
  }, [testCount, revocableWallet, shuffledNumbers, revoker])

  useEffect(() => shuffleMnemonic(), [shuffleMnemonic])

  useEffect(() => {
    // If we've passed the required number of tests, then we can proceed
    if (testCount >= TEST_COUNT_REQUIRED) {
      navigate(BackupPassphraseRoutes.Success)
      return () => {
        // Make sure the component is completely unmounted before we revoke the mnemonic
        setTimeout(() => revoker.revoke(), 250)
      }
    }
  }, [testCount, navigate, revoker])

  const handleClick = (index: number) => {
    if (index === testState?.correctAnswerIndex) {
      setTestCount(testCount + 1)
    } else {
      void shuffleMnemonic()
    }
  }

  const handleCheckBoxClick = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setHasAlreadySaved(e.target.checked)
  }, [])

  const handleSkipClick = useCallback(() => navigate(BackupPassphraseRoutes.Success), [navigate])

  const handleBackClick = useCallback(() => {
    navigate(-1)
  }, [navigate])

  if (!testState) return null

  return (
    <Box>
      <IconButton
        variant='ghost'
        icon={arrowBackIcon}
        aria-label={translate('common.back')}
        fontSize='xl'
        size='sm'
        isRound
        onClick={handleBackClick}
      />
      <ModalHeader pt={4}>
        <Text translation={'modals.shapeShift.backupPassphrase.testTitle'} />
      </ModalHeader>
      {!preventClose && <ModalCloseButton />}
      <ModalBody>
        <SlideTransition>
          <RawText>
            <Text
              as='span'
              color='text.subtle'
              translation={'walletProvider.shapeShift.testPhrase.body'}
            />{' '}
            <Tag colorScheme='green'>
              {translate(
                `walletProvider.shapeShift.testPhrase.${
                  testState.targetWordIndex + 1
                }${makeOrdinalSuffix(testState.targetWordIndex + 1)}`,
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
                    // we need to pass an arg here, so we need an anonymous function wrapper
                    // eslint-disable-next-line react-memo/require-usememo
                    onClick={() => handleClick(index)}
                  >
                    {word}
                  </Button>,
                  revoker.addRevoker.bind(revoker),
                ),
              )}
          </Wrap>
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
            <Checkbox mb={4} spacing={4} onChange={handleCheckBoxClick} isChecked={hasAlreadySaved}>
              <Text
                fontSize='sm'
                fontWeight='bold'
                translation={'walletProvider.shapeShift.legacy.alreadySavedConfirm'}
              />
            </Checkbox>
            <Button
              colorScheme='blue'
              width='full'
              size='md'
              isDisabled={!hasAlreadySaved}
              onClick={handleSkipClick}
            >
              <Text translation={'common.skip'} />
            </Button>
          </Box>
        </SlideTransition>
      </ModalBody>
    </Box>
  )
}
