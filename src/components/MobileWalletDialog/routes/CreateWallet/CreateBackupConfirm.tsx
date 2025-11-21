import { Box, Button, Flex, Text as CText, VStack } from '@chakra-ui/react'
import * as bip39 from 'bip39'
import { uniq } from 'lodash'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { useLocation, useNavigate } from 'react-router-dom'

import { MobileWalletDialogRoutes } from '../../types'
import { getRandomIndicesIndexes, getRandomWords } from '../../utils'

import { CarouselDots } from '@/components/CarouselDots/CarouselDots'
import { DialogBackButton } from '@/components/Modal/components/DialogBackButton'
import { DialogBody } from '@/components/Modal/components/DialogBody'
import { DialogCloseButton } from '@/components/Modal/components/DialogCloseButton'
import { DialogFooter } from '@/components/Modal/components/DialogFooter'
import {
  DialogHeader,
  DialogHeaderLeft,
  DialogHeaderMiddle,
  DialogHeaderRight,
} from '@/components/Modal/components/DialogHeader'
import { SlideTransition } from '@/components/SlideTransition'

const TEST_COUNT_REQUIRED = 3

export const CreateBackupConfirm = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const translate = useTranslate()
  const [targetIndices, setTargetIndices] = useState<number[]>([])
  const [selections, setSelections] = useState<string[]>([])

  const words = useMemo(() => {
    if (!location.state?.vault) return []
    return location.state.vault.getWords() ?? []
  }, [location.state?.vault])

  useEffect(() => {
    if (words.length > 0) {
      setTargetIndices(getRandomIndicesIndexes(words.length, TEST_COUNT_REQUIRED))
    }
  }, [words])

  const options = useMemo(() => {
    return targetIndices.map(idx => {
      const correct = words[idx]
      const distractors = getRandomWords(bip39.wordlists.english, correct, 2)
      return uniq([correct, ...distractors]).sort(() => Math.random() - 0.5)
    })
  }, [targetIndices, words])

  const isCorrect = useMemo(() => {
    return selections.every((word, i) => word === words[targetIndices[i]])
  }, [selections, words, targetIndices])

  const handleSelect = (line: number, word: string) => {
    setSelections(prev => {
      const next = [...prev]
      next[line] = word
      return next
    })
  }

  const hasChosenWords = useMemo(() => {
    return selections.filter(Boolean).length === TEST_COUNT_REQUIRED
  }, [selections])

  const handleSubmit = useCallback(() => {
    if (!isCorrect && hasChosenWords) {
      navigate(MobileWalletDialogRoutes.CreateWordsError, {
        state: { vault: location.state?.vault },
      })
      return
    }

    if (isCorrect) {
      navigate(MobileWalletDialogRoutes.CreateBackupSuccess, {
        state: { vault: location.state?.vault },
      })
    }
  }, [hasChosenWords, navigate, location.state?.vault, isCorrect])

  const handleSkip = useCallback(() => {
    navigate(MobileWalletDialogRoutes.CreateSkipConfirm, {
      state: { vault: location.state?.vault },
    })
  }, [navigate, location.state?.vault])

  const handleBack = useCallback(() => {
    navigate(MobileWalletDialogRoutes.CreateBackup, { state: { vault: location.state?.vault } })
  }, [navigate, location.state?.vault])

  const getActiveBackground = useCallback(
    (index: number, word: string) => {
      return {
        bg: selections[index] === word ? 'blue.500' : undefined,
      }
    },
    [selections],
  )

  return (
    <SlideTransition>
      <DialogHeader>
        <DialogHeaderLeft>
          <DialogBackButton onClick={handleBack} />
        </DialogHeaderLeft>
        <DialogHeaderMiddle>
          <Box minWidth='50px'>
            <CarouselDots length={4} activeIndex={4} />
          </Box>
        </DialogHeaderMiddle>
        <DialogHeaderRight>
          <DialogCloseButton />
        </DialogHeaderRight>
      </DialogHeader>
      <DialogBody>
        <VStack spacing={6} alignItems='stretch'>
          <Box>
            <CText fontSize='2xl' fontWeight='bold' textAlign='center'>
              {translate('modals.shapeShift.backupPassphrase.title')}
            </CText>
            <CText color='text.subtle' textAlign='center' display='block' mb={6}>
              {translate('modals.shapeShift.backupPassphrase.description')}{' '}
            </CText>
          </Box>

          {options.map((opts, i) => (
            <Box>
              <CText display='block' mb={2} fontWeight='bold' fontSize='lg'>
                {translate('modals.shapeShift.backupPassphrase.wordNumber', {
                  number: targetIndices[i] + 1,
                })}
              </CText>
              <Flex key={i} justify='center' gap={2}>
                {opts.map(word => (
                  <Button
                    key={word}
                    variant={'solid'}
                    colorScheme={selections[i] === word ? 'blue' : 'gray'}
                    bg={getActiveBackground(i, word).bg}
                    _hover={getActiveBackground(i, word)}
                    // We can't memo this as it contains parameters
                    onClick={() => handleSelect(i, word)}
                    px={4}
                    py={2}
                    borderRadius='lg'
                    width='33%'
                  >
                    {word}
                  </Button>
                ))}
              </Flex>
            </Box>
          ))}
        </VStack>
      </DialogBody>
      <DialogFooter flexDirection='column' gap={2} mt={14}>
        <Button
          colorScheme='blue'
          onClick={handleSubmit}
          isDisabled={!hasChosenWords}
          width='100%'
          size='lg'
        >
          {translate('common.continue')}
        </Button>
        <Button onClick={handleSkip} width='100%' variant='ghost' size='lg'>
          {translate('common.skip')}
        </Button>
      </DialogFooter>
    </SlideTransition>
  )
}
