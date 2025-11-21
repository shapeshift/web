import { ArrowBackIcon } from '@chakra-ui/icons'
import {
  Box,
  Button,
  Flex,
  IconButton,
  ModalBody,
  ModalCloseButton,
  ModalHeader,
  Text as CText,
  VStack,
} from '@chakra-ui/react'
import { crypto } from '@shapeshiftoss/hdwallet-native'
import * as bip39 from 'bip39'
import uniq from 'lodash/uniq'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { useNavigate } from 'react-router-dom'

import type { LocationState } from './BackupPassphraseCommon'
import { BackupPassphraseRoutes } from './BackupPassphraseCommon'

import { getRandomIndicesIndexes, getRandomWords } from '@/components/MobileWalletDialog/utils'
import { SlideTransition } from '@/components/SlideTransition'
import { Text } from '@/components/Text'
import { useModal } from '@/hooks/useModal/useModal'

const Revocable = crypto.Isolation.Engines.Default.Revocable
const revocable = crypto.Isolation.Engines.Default.revocable

const TEST_COUNT_REQUIRED = 3

type TestState = {
  targetIndices: number[]
  options: string[][]
  selectedWords: string[]
}

const arrowBackIcon = <ArrowBackIcon />

export const BackupPassphraseTest: React.FC<LocationState> = props => {
  const { revocableWallet } = props
  const translate = useTranslate()
  const navigate = useNavigate()
  const [testState, setTestState] = useState<TestState | null>(null)
  const [revoker] = useState(new (Revocable(class {}))())
  const [, setError] = useState<string | null>(null)
  const { props: backupNativePassphraseProps } = useModal('backupNativePassphrase')
  const preventClose = backupNativePassphraseProps?.preventClose

  const generateTestState = useCallback(() => {
    try {
      const words = revocableWallet.getWords()
      if (!words || words.length < 12) {
        return setError('walletProvider.shapeShift.create.error')
      }

      const targetIndices = getRandomIndicesIndexes(words.length, TEST_COUNT_REQUIRED)
      const options = targetIndices.map(idx => {
        const correct = words[idx]

        if (!correct) return []

        const distractors = getRandomWords(bip39.wordlists.english, correct, 2)
        return uniq([correct, ...distractors]).sort(() => Math.random() - 0.5)
      })

      setTestState(
        revocable(
          {
            targetIndices,
            options,
            selectedWords: Array(TEST_COUNT_REQUIRED).fill(null),
          },
          revoker.addRevoker.bind(revoker),
        ),
      )
    } catch (e) {
      setError('walletProvider.shapeShift.create.error')
    }
  }, [revocableWallet, revoker])

  useEffect(() => {
    generateTestState()
  }, [generateTestState])

  const handleSelect = (line: number, index: number) => {
    if (!testState) return

    setTestState(prev => {
      if (!prev) return prev
      const next = { ...prev }
      next.selectedWords[line] = testState.options[line][index]
      return revocable(next, revoker.addRevoker.bind(revoker))
    })
  }

  const isCorrect = useMemo(() => {
    if (!testState) return false
    const words = revocableWallet.getWords()
    if (!words) return false

    return testState.selectedWords.every((word, i) => word === words[testState.targetIndices[i]])
  }, [revocableWallet, testState])

  const hasChosenWords = useMemo(() => {
    return testState?.selectedWords.every(w => w !== null) ?? false
  }, [testState])

  const handleSubmit = useCallback(() => {
    if (!hasChosenWords) return

    if (!isCorrect) {
      navigate(BackupPassphraseRoutes.WordsError)
      return
    }

    navigate(BackupPassphraseRoutes.Success)
    setTimeout(() => revoker.revoke(), 250)
  }, [hasChosenWords, isCorrect, navigate, revoker])

  const handleSkip = useCallback(() => {
    navigate(BackupPassphraseRoutes.Skip)
  }, [navigate])

  const handleBack = useCallback(() => {
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
        onClick={handleBack}
      />
      <ModalHeader pt={4}>
        <Text translation={'modals.shapeShift.backupPassphrase.testTitle'} />
      </ModalHeader>
      {!preventClose && <ModalCloseButton />}
      <ModalBody>
        <SlideTransition>
          <Text
            color='text.subtle'
            translation={'modals.shapeShift.backupPassphrase.description'}
            mb={12}
          />
          <VStack alignItems='stretch'>
            {testState.options.map((lineWords, i) => (
              <Box key={i} borderRadius='xl' position='relative' mb={4}>
                <CText
                  textAlign='center'
                  pointerEvents='none'
                  px={2}
                  width='max-content'
                  fontWeight='bold'
                  mb={2}
                >
                  {translate('modals.shapeShift.backupPassphrase.wordNumber', {
                    number: testState.targetIndices[i] + 1,
                  })}
                </CText>

                <Flex justify='center' gap={2}>
                  {lineWords.map((word: string, index: number) =>
                    revocable(
                      <Button
                        key={`${word}-${index}`}
                        variant='solid'
                        size='md'
                        colorScheme={testState.selectedWords[i] === word ? 'blue' : 'gray'}
                        // Can't use useCallback here because it has parameters
                        onClick={() => handleSelect(i, index)}
                        px={4}
                        py={2}
                        height='auto'
                        borderRadius='lg'
                        width='33%'
                      >
                        {word}
                      </Button>,
                      revoker.addRevoker.bind(revoker),
                    ),
                  )}
                </Flex>
              </Box>
            ))}
          </VStack>

          <Flex flexDir='column' gap={2} justifyContent='center' mt={6}>
            <Button
              colorScheme='blue'
              onClick={handleSubmit}
              isDisabled={!hasChosenWords}
              size='lg'
              width='100%'
            >
              {translate('common.continue')}
            </Button>
            <Button onClick={handleSkip} size='lg' width='100%' variant='ghost'>
              {translate('common.skip')}
            </Button>
          </Flex>
        </SlideTransition>
      </ModalBody>
    </Box>
  )
}
