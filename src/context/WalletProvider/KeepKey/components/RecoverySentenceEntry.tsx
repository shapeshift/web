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
  useToast,
} from '@chakra-ui/react'
import { isKeepKey } from '@shapeshiftoss/hdwallet-keepkey'
import { KeyboardEvent, MouseEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { AwaitKeepKey } from 'components/Layout/Header/NavBar/KeepKey/AwaitKeepKey'
import { RawText, Text } from 'components/Text'
import { WalletActions } from 'context/WalletProvider/actions'
import { useWallet } from 'hooks/useWallet/useWallet'

const isLetter = (str: string) => {
  return str.length === 1 && str.match(/[a-z]/i)
}

const minInputLength = 3
const maxInputLength = 4

const isValidInput = (
  e: KeyboardEvent,
  wordEntropy: number,
  currentCharacterIndex: number = 0,
  currentWordIndex: number = 0,
) => {
  const isSpace = e.key === ' '
  const isEnter = e.key === 'Enter'
  const isBackspace = e.key === 'Backspace'
  // KeepKey sets character index to 4 when word is complete, and we are awaiting a space
  const hasFilledAllInputs = currentCharacterIndex === maxInputLength
  const hasEnoughCharactersForWordMatch = currentCharacterIndex >= minInputLength - 1
  const isLastWord = currentWordIndex === wordEntropy - 1
  const noCharactersEntered = currentCharacterIndex === 0

  // The 4th letter must be followed by space, enter or backspace
  if (hasFilledAllInputs && !isSpace && !isEnter && !isBackspace) return false
  // We can only do enter or space if we've received 3 or more characters
  if (!hasEnoughCharactersForWordMatch && (isSpace || isEnter)) return false
  // We can't do space on last word
  if (isLastWord && isSpace) return false
  // We can't do enter not on last word
  if (!isLastWord && isEnter) return false
  // The UI doesn't currently support returning to a previous word
  if (noCharactersEntered && isBackspace) return false

  // If we haven't early exited yet, the input is valid
  return true
}

const inputValuesReducer = (
  currentValues: Array<string | undefined>,
  newValue: string | undefined,
  newValueIndex: number,
) => {
  const newValues = currentValues.slice()
  newValues[newValueIndex] = newValue?.toUpperCase()
  return newValues
}

export const KeepKeyRecoverySentenceEntry = () => {
  const {
    dispatch,
    state: {
      wallet,
      deviceState: {
        stagedEntropy,
        currentWordIndex,
        currentCharacterIndex = 0,
        awaitingDeviceInteraction,
      },
    },
  } = useWallet()
  const toast = useToast()
  const translate = useTranslate()
  const [wordCount, setWordCount] = useState(12)
  const [characterInputValues, setCharacterInputValues] = useState(
    Object.seal(new Array<string | undefined>(maxInputLength).fill(undefined)),
  )
  const [awaitingKeepKeyResponse, setAwaitingKeepKeyResponse] = useState(true)

  const inputField1 = useRef<HTMLInputElement>(null)
  const inputField2 = useRef<HTMLInputElement>(null)
  const inputField3 = useRef<HTMLInputElement>(null)
  const inputField4 = useRef<HTMLInputElement>(null)
  const inputFields = useMemo(
    () => [inputField1, inputField2, inputField3, inputField4],
    [inputField1, inputField2, inputField3, inputField4],
  )

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

  // If an index updates we've heard back from the device
  useEffect(() => {
    setAwaitingKeepKeyResponse(false)
  }, [currentCharacterIndex, currentWordIndex])

  // Focus on the first input field once restore action confirmed on the device
  useEffect(() => {
    inputFields[0].current?.focus()
  }, [awaitingDeviceInteraction, inputFields])

  const wordCountCircle = useMemo(() => {
    const size = 2.5
    const paddedNumber = String((currentWordIndex || 0) + 1).padStart(2, '0')
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
  }, [currentWordIndex])

  const resetInputs = useCallback(() => {
    inputFields[0].current?.focus()
    setCharacterInputValues(current => {
      const newValues = current.slice()
      return newValues.fill(undefined)
    })
  }, [inputFields])

  const handleWordSubmit = useCallback(async () => {
    const isLastWord = currentWordIndex === wordCount - 1
    // If we've entered all words in our seed phrase, tell KeepKey we're done
    if (isLastWord) {
      await keepKeyWallet?.sendCharacterDone()
      dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: false })
      toast({
        title: translate('common.success'),
        description: translate('modals.keepKey.recoverySentenceEntry.toastMessage'),
        status: 'success',
        isClosable: true,
      })
      // Else send a Space to let KeepKey know we're ready to enter the next word
    } else {
      await keepKeyWallet?.sendCharacter(' ')
      resetInputs()
    }
  }, [currentWordIndex, dispatch, keepKeyWallet, resetInputs, toast, translate, wordCount])

  const onCharacterInput = useCallback(
    async (e: KeyboardEvent) => {
      // The KeepKey is not yet ready to receive inputs
      if (awaitingKeepKeyResponse) return

      // We can't allow tabbing between inputs or the focused element gets out of sync with the KeepKey
      if (e.key === 'Tab') e.preventDefault()

      if (!isValidInput(e, wordCount, currentCharacterIndex, currentWordIndex)) return
      if (isLetter(e.key)) {
        setCharacterInputValues(c => inputValuesReducer(c, e.key, currentCharacterIndex))
        setAwaitingKeepKeyResponse(true)
        await keepKeyWallet?.sendCharacter(e.key)
      } else if (e.key === ' ') {
        resetInputs()
        setAwaitingKeepKeyResponse(true)
        await keepKeyWallet?.sendCharacter(' ')
      } else if (e.key === 'Backspace') {
        setCharacterInputValues(c => inputValuesReducer(c, undefined, currentCharacterIndex - 1))
        setAwaitingKeepKeyResponse(true)
        await keepKeyWallet?.sendCharacterDelete()
      } else if (e.key === 'Enter') {
        setAwaitingKeepKeyResponse(true)
        await handleWordSubmit()
      } else {
        console.error('Invalid input', e.key)
      }
    },
    [
      awaitingKeepKeyResponse,
      currentCharacterIndex,
      currentWordIndex,
      handleWordSubmit,
      keepKeyWallet,
      resetInputs,
      wordCount,
    ],
  )

  const preventClickIfNotCurrentIndex = (e: MouseEvent<HTMLInputElement>, inputIndex: number) => {
    if (inputIndex !== currentCharacterIndex) {
      e.preventDefault()
    }
  }

  const pinInputFieldProps: PinInputFieldProps = useMemo(
    () => ({
      background: 'blackAlpha.300',
      autoComplete: 'off',
      pattern: '[a-z]|[A-Z]',
      onKeyDown: onCharacterInput,
    }),
    [onCharacterInput],
  )

  return (
    <>
      <ModalHeader>
        <Text translation={'modals.keepKey.recoverySentenceEntry.header'} />
      </ModalHeader>
      <ModalBody>
        <Text color='gray.500' translation={'modals.keepKey.recoverySentenceEntry.body'} mb={4} />
        <AwaitKeepKey translation='modals.keepKey.recoverySentenceEntry.awaitingButtonPress'>
          <HStack justifyContent='space-between'>
            {wordCountCircle}
            <PinInput
              id='character-input'
              type='alphanumeric'
              size='lg'
              placeholder=''
              errorBorderColor='red.500'
              value={characterInputValues.join('')}
            >
              {inputFields.map((_, i) => {
                return (
                  <PinInputField
                    key={i}
                    ref={inputFields[i]}
                    {...pinInputFieldProps}
                    onMouseDown={e => preventClickIfNotCurrentIndex(e, i)}
                  />
                )
              })}
            </PinInput>
          </HStack>
          <Divider my={5} />
          <Flex alignItems='center' justifyContent='space-between'>
            <Progress
              width='40%'
              min={0}
              max={wordCount}
              value={(currentWordIndex || 0) + 1}
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
              disabled={currentCharacterIndex ? currentCharacterIndex < 3 : true}
            >
              <Text translation={'modals.keepKey.recoverySentenceEntry.button'} />
            </Button>
          </Flex>
        </AwaitKeepKey>
      </ModalBody>
    </>
  )
}
