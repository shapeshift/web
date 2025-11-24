import { Box, Button, Flex, ModalBody, ModalHeader, Text as CText, VStack } from '@chakra-ui/react'
import { crypto } from '@shapeshiftoss/hdwallet-native'
import { skipToken, useQuery } from '@tanstack/react-query'
import * as bip39 from 'bip39'
import uniq from 'lodash/uniq'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { useLocation, useNavigate } from 'react-router'

import { NativeWalletRoutes } from '../../types'

import { getRandomIndicesIndexes, getRandomWords } from '@/components/MobileWalletDialog/utils'
import { Text } from '@/components/Text'

const Revocable = crypto.Isolation.Engines.Default.Revocable
const revocable = crypto.Isolation.Engines.Default.revocable

const TEST_COUNT_REQUIRED = 3

type TestState = {
  targetIndices: number[]
  options: string[][]
  selectedWords: (string | null)[]
}

export const NativeTestPhrase = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const translate = useTranslate()
  const [testState, setTestState] = useState<TestState | null>(null)
  const [revoker] = useState(new (Revocable(class {}))())
  const [, setError] = useState<string | null>(null)

  const { vault } = location.state

  const generateTestState = useCallback(async () => {
    try {
      const mnemonic = await vault.unwrap().get('#mnemonic')
      const words = mnemonic.split(' ')

      const targetIndices = getRandomIndicesIndexes(words.length, TEST_COUNT_REQUIRED)
      const options = targetIndices.map(idx => {
        const correct = words[idx]
        const distractors = getRandomWords(bip39.wordlists.english, correct, 2)
        return uniq([correct, ...distractors]).sort(() => Math.random() - 0.5)
      })

      setTestState(
        revocable(
          {
            targetIndices,
            options,
            selectedWords: [],
          },
          revoker.addRevoker.bind(revoker),
        ),
      )
    } catch (e) {
      setError('walletProvider.shapeShift.create.error')
    }
  }, [vault, revoker])

  useEffect(() => {
    generateTestState()
  }, [generateTestState])

  const handleBackupComplete = useCallback(() => {
    navigate('/native/password', { state: { vault } })
    setTimeout(() => revoker.revoke(), 250)
  }, [navigate, revoker, vault])

  const handleSelect = (line: number, index: number) => {
    if (!testState) return

    setTestState(prev => {
      if (!prev) return prev
      const next = { ...prev }
      next.selectedWords[line] = testState.options[line][index]
      return revocable(next, revoker.addRevoker.bind(revoker))
    })
  }

  const { data: isCorrect } = useQuery({
    queryKey: ['isCorrect', testState?.selectedWords],
    queryFn: testState
      ? async () => {
          if (!testState) return false
          const mnemonic = await vault.unwrap().get('#mnemonic')

          const words = mnemonic.split(' ')

          return testState.selectedWords.every(
            (word, i) => word === words[testState.targetIndices[i]],
          )
        }
      : skipToken,
  })

  const hasChosenWords = useMemo(() => {
    return testState?.selectedWords.filter(Boolean).length === TEST_COUNT_REQUIRED
  }, [testState])

  const handleSubmit = useCallback(() => {
    if (!hasChosenWords) return

    if (!isCorrect) {
      navigate(NativeWalletRoutes.WordsError, { state: { vault } })
      return
    }

    handleBackupComplete()
  }, [hasChosenWords, isCorrect, handleBackupComplete, navigate, vault])

  const handleSkip = useCallback(() => {
    navigate(NativeWalletRoutes.SkipConfirm, { state: { vault } })
  }, [navigate, vault])

  return !testState ? null : (
    <>
      <ModalHeader>
        <Text translation={'modals.shapeShift.backupPassphrase.title'} />
      </ModalHeader>
      <ModalBody width='100%'>
        <Text
          color='text.subtle'
          translation={'modals.shapeShift.backupPassphrase.desktopDescription'}
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
                      // Can't memo this as it contains parameters
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
      </ModalBody>
    </>
  )
}
