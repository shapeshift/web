import { PinInputFieldProps } from '@chakra-ui/pin-input/dist/declarations/src/pin-input'
import {
  Box,
  Button,
  Divider,
  Flex,
  HStack,
  ModalBody,
  ModalHeader,
  PinInput,
  PinInputField,
  Progress,
} from '@chakra-ui/react'
import { isKeepKey } from '@shapeshiftoss/hdwallet-keepkey'
import isUndefined from 'lodash/isUndefined'
import { KeyboardEvent, useEffect, useMemo, useRef, useState } from 'react'
import { AwaitKeepKey } from 'components/Layout/Header/NavBar/KeepKey/AwaitKeepKey'
import { RawText, Text } from 'components/Text'
import { useWallet } from 'hooks/useWallet/useWallet'

const isLetter = (str: string) => {
  return str.length === 1 && str.match(/[a-z]/i)
}

const isInvalidInput = (
  e: KeyboardEvent,
  wordEntropy: number,
  currentCharacterPosition: number = 0,
  currentWordPosition: number = 0,
) => {
  // The 4th letter must be followed by space, enter or backspace
  if (e.key !== ' ' && e.key !== 'Enter' && e.key !== 'Backspace' && currentCharacterPosition === 4)
    return true

  // We can only do enter or space if we've received 3 or more characters
  if ((e.key === ' ' || e.key === 'Enter') && currentCharacterPosition < 3) return true
  // We can't do space on last word
  if (e.key === ' ' && currentWordPosition === wordEntropy - 1) return true
  // We can't do enter not on last word
  if (e.key === 'Enter' && currentWordPosition !== wordEntropy - 1) return true

  return false
}

export const KeepKeyRecoverySentenceEntry = () => {
  const {
    state: {
      wallet,
      deviceState: { stagedEntropy, currentWordPosition, currentCharacterPosition },
    },
  } = useWallet()
  const [wordCount, setWordCount] = useState(12)
  const [acceptingCipherInput, setAcceptingCipherInput] = useState(false)

  const charInputRef = useRef<HTMLInputElement>(null)
  const charInputFieldRef1 = useRef<HTMLInputElement>(null)
  const charInputFieldRef2 = useRef<HTMLInputElement>(null)
  const charInputFieldRef3 = useRef<HTMLInputElement>(null)
  const charInputFieldRef4 = useRef<HTMLInputElement>(null)

  const keepKeyWallet = wallet && isKeepKey(wallet) ? wallet : undefined

  useEffect(() => {
    setWordCount(() => {
      switch (stagedEntropy) {
        case 128:
          return 12
        case 192:
          return 18
        case 256:
          return 24
        default:
          return 12
      }
    })
  }, [stagedEntropy])

  useEffect(() => {
    setAcceptingCipherInput(
      !(isUndefined(currentWordPosition) && isUndefined(currentCharacterPosition)),
    )
  }, [currentCharacterPosition, currentWordPosition])

  const wordCountCircle = useMemo(() => {
    const size = 2.5
    const paddedNumber = String((currentWordPosition || 0) + 1).padStart(2, '0')
    return (
      <Box
        borderWidth='2px'
        borderColor='whiteAlpha.100'
        fontSize='md'
        borderRadius='50%'
        verticalAlign='middle'
        textAlign='center'
        width={`${size}em`}
        height={`${size}em`}
        lineHeight={`${size * 0.9}em`}
      >
        <RawText fontWeight='bold'>{paddedNumber}</RawText>
      </Box>
    )
  }, [currentWordPosition])

  const onCharacterInput = async (e: KeyboardEvent) => {
    if (isInvalidInput(e, wordCount, currentCharacterPosition, currentWordPosition)) return

    if (isLetter(e.key)) {
      await keepKeyWallet?.sendCharacter(e.key.toLowerCase())
    } else if (e.key === ' ') {
      await keepKeyWallet?.sendCharacter(' ')
      console.log('currentCharacterPosition', currentCharacterPosition)
      if (currentCharacterPosition === 3) {
        resetInputs()
      }
    } else if (e.key === 'Backspace') {
      await keepKeyWallet?.sendCharacterDelete()
    } else if (e.key === 'Enter') {
      await keepKeyWallet?.sendCharacterDone()
    } else {
      console.error('not a letter!', e.key)
    }
  }

  const resetInputs = () => {
    charInputFieldRef1.current?.focus()
  }

  const handleWordSubmit = async () => {
    await keepKeyWallet?.sendCharacter(' ')
    resetInputs()
  }

  const onWordComplete = async () => {
    await keepKeyWallet?.sendCharacter(' ')
    resetInputs()
  }

  const pinInputFieldProps: PinInputFieldProps = {
    background: 'blackAlpha.300',
    autoComplete: 'off',
    pattern: '[a-z]|[A-Z]',
    onKeyDown: onCharacterInput,
  }

  return (
    <>
      <ModalHeader>
        <Text translation={'modals.keepKey.recoverySentenceEntry.header'} />
      </ModalHeader>
      <ModalBody>
        <Text color='gray.500' translation={'modals.keepKey.recoverySentenceEntry.body'} mb={4} />
        {acceptingCipherInput ? (
          <>
            <HStack justifyContent='space-between'>
              {wordCountCircle}
              <PinInput
                id='character-input'
                type='alphanumeric'
                autoFocus
                size='lg'
                placeholder=''
                errorBorderColor='red.500'
                onComplete={onWordComplete}
              >
                <PinInputField {...pinInputFieldProps} ref={charInputFieldRef1} />
                <PinInputField {...pinInputFieldProps} ref={charInputFieldRef2} />
                <PinInputField {...pinInputFieldProps} ref={charInputFieldRef3} />
                <PinInputField {...pinInputFieldProps} ref={charInputFieldRef4} />
              </PinInput>
            </HStack>
            <Divider my={5} />
            <Flex alignItems='center' justifyContent='space-between'>
              <Progress
                width='40%'
                min={0}
                max={wordCount}
                value={(currentWordPosition || 0) + 1}
                background='whiteAlpha.50'
                borderRadius='lg'
                sx={{
                  '& > div': {
                    background: 'blue.500',
                  },
                }}
              />
              <Button
                width='30%'
                size='lg'
                colorScheme='blue'
                type='submit'
                onClick={handleWordSubmit}
                mb={3}
                disabled={currentCharacterPosition ? currentCharacterPosition < 3 : true}
              >
                <Text translation={'modals.keepKey.recoverySentenceEntry.button'} />
              </Button>
            </Flex>
          </>
        ) : (
          <AwaitKeepKey translation='modals.keepKey.recoverySentenceEntry.awaitingButtonPress' />
        )}
      </ModalBody>
    </>
  )
}
