import {
  Box,
  Button,
  Flex,
  Icon,
  ModalBody,
  ModalHeader,
  Text as CText,
  useColorModeValue,
  VStack,
} from '@chakra-ui/react'
import { Default } from '@shapeshiftoss/hdwallet-native/dist/crypto/isolation/engines'
import * as bip39 from 'bip39'
import range from 'lodash/range'
import shuffle from 'lodash/shuffle'
import slice from 'lodash/slice'
import uniq from 'lodash/uniq'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { FaCheck } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'
import { Text } from 'components/Text'

import type { NativeSetupProps } from '../types'

const Revocable = Default.Revocable
const revocable = Default.revocable

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
  const borderColor = useColorModeValue('gray.300', 'whiteAlpha.200')
  const dottedTitleBackground = useColorModeValue('#f7fafc', '#2e3236')
  const [testState, setTestState] = useState<TestState | null>(null)
  const testCount = useRef(0)
  const [revoker] = useState(new (Revocable(class {}))())
  const [shuffledNumbers] = useState(slice(shuffle(range(12)), 0, TEST_COUNT_REQUIRED))
  const [, setError] = useState<string | null>(null)
  const isInitiallyShuffled = useRef(false)

  const backgroundDottedSx = useMemo(
    () => ({
      content: '""',
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor,
      borderRadius: 'xl',
      mask: 'linear-gradient(to bottom, black 20%, transparent 100%)',
      WebkitMask: 'linear-gradient(to bottom, black 20%, transparent 100%)',
    }),
    [borderColor],
  )

  const { vault } = location.state

  const shuffleMnemonic = useCallback(async () => {
    if (testCount.current >= TEST_COUNT_REQUIRED) return
    try {
      const mnemonic = await vault.unwrap().get('#mnemonic')
      const words = mnemonic.split(' ')
      let randomWords = uniq(bip39.generateMnemonic(256).split(' ')) as string[]

      const targetWordIndex = shuffledNumbers[testCount.current]
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
    if (!isInitiallyShuffled.current) {
      shuffleMnemonic()
      isInitiallyShuffled.current = true
    }
  }, [shuffleMnemonic])

  const handleBackupComplete = useCallback(() => {
    vault.seal()
    history.replace('/native/password', { vault })
    setTimeout(() => revoker.revoke(), 250)
  }, [history, revoker, vault])

  const handleClick = (index: number) => {
    if (index === testState?.correctAnswerIndex) {
      testCount.current++

      if (testCount.current >= TEST_COUNT_REQUIRED) {
        handleBackupComplete()
      } else {
        shuffleMnemonic()
      }
    } else {
      shuffleMnemonic()
    }
  }

  return !testState ? null : (
    <>
      <ModalHeader>
        <Text translation={'modals.shapeShift.backupPassphrase.title'} />
      </ModalHeader>
      <ModalBody>
        <Text
          color='text.subtle'
          translation={'modals.shapeShift.backupPassphrase.description'}
          mb={12}
        />
        <VStack spacing={6} alignItems='stretch'>
          <Box borderRadius='xl' p={6} position='relative' pb={20}>
            <CText
              textAlign='center'
              position='absolute'
              pointerEvents='none'
              zIndex='1'
              top='0'
              left='50%'
              transform='translateX(-50%) translateY(-50%)'
              px={2}
              width='max-content'
              color='text.subtle'
              bg={dottedTitleBackground}
            >
              <Text as='span' translation={'walletProvider.shapeShift.testPhrase.body'} />{' '}
              <Box as='span' color='blue.500' fontWeight='bold'>
                {translate(
                  `walletProvider.shapeShift.testPhrase.${
                    testState.targetWordIndex + 1
                  }${ordinalSuffix(testState.targetWordIndex + 1)}`,
                )}
              </Box>
              <Text as='span' ml={1} translation={'walletProvider.shapeShift.testPhrase.body2'} />
            </CText>

            <Box
              width='100%'
              height='100%'
              position='absolute'
              borderRadius='xl'
              pointerEvents='none'
              left='0'
              top='0'
              _before={backgroundDottedSx}
            />

            <Flex wrap='wrap' justify='center' gap={2}>
              {testState.randomWords.map((word: string, index: number) =>
                revocable(
                  <Button
                    key={`${word}-${index}`}
                    variant='solid'
                    size='md'
                    colorScheme='gray'
                    // eslint-disable-next-line react-memo/require-usememo
                    onClick={() => handleClick(index)}
                    px={4}
                    py={2}
                    height='auto'
                    borderRadius='lg'
                  >
                    {word}
                  </Button>,
                  revoker.addRevoker.bind(revoker),
                ),
              )}
            </Flex>
          </Box>
        </VStack>

        <Flex justifyContent='center' mt={6}>
          <Flex gap={2} justify='center'>
            {Array.from({ length: TEST_COUNT_REQUIRED }).map((_, index) => (
              <Box
                key={index}
                w='16px'
                h='16px'
                borderRadius='full'
                bg={index < testCount.current ? 'blue.500' : 'transparent'}
                borderWidth={1}
                borderStyle='dashed'
                borderColor={borderColor}
                display='flex'
                alignItems='center'
                justifyContent='center'
              >
                {index < testCount.current && <Icon as={FaCheck} boxSize='8px' color='white' />}
              </Box>
            ))}
          </Flex>
        </Flex>
      </ModalBody>
    </>
  )
}
