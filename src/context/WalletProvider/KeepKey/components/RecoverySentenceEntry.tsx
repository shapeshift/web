import type { PinInputFieldProps } from '@chakra-ui/react'
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
  useColorModeValue,
} from '@chakra-ui/react'
import { isKeepKey } from '@shapeshiftoss/hdwallet-keepkey'
import type { KeyboardEvent, MouseEvent } from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useHistory } from 'react-router-dom'
import { AwaitKeepKey } from 'components/Layout/Header/NavBar/KeepKey/AwaitKeepKey'
import { RawText, Text } from 'components/Text'
import { inputValuesReducer, isLetter, isValidInput } from 'context/WalletProvider/KeepKey/helpers'
import { useKeepKeyCancel } from 'context/WalletProvider/KeepKey/hooks/useKeepKeyCancel'
import { KeepKeyRoutes } from 'context/WalletProvider/routes'
import { useWallet } from 'hooks/useWallet/useWallet'

const minInputLength = 3
const maxInputLength = 4

export const KeepKeyRecoverySentenceEntry = () => {
  const {
    state: {
      wallet,
      deviceState: {
        recoveryEntropy,
        recoveryWordIndex,
        recoveryCharacterIndex = 0,
        awaitingDeviceInteraction,
      },
    },
  } = useWallet()
  const history = useHistory()
  const handleCancel = useKeepKeyCancel()
  const [wordEntropy, setWordEntropy] = useState<12 | 18 | 24>(12)
  const [characterInputValues, setCharacterInputValues] = useState(
    Object.seal(new Array<string | undefined>(maxInputLength).fill(undefined)),
  )
  const [passphrase, setPassphrase] = useState<(string | undefined)[][]>()
  const [awaitingKeepKeyResponse, setAwaitingKeepKeyResponse] = useState(true)

  const inputField1 = useRef<HTMLInputElement>(null)
  const inputField2 = useRef<HTMLInputElement>(null)
  const inputField3 = useRef<HTMLInputElement>(null)
  const inputField4 = useRef<HTMLInputElement>(null)
  const inputFields = useMemo(
    () => [inputField1, inputField2, inputField3, inputField4],
    [inputField1, inputField2, inputField3, inputField4],
  )

  const circleBorderColor = useColorModeValue('blackAlpha.100', 'whiteAlpha.100')
  const inputBackgroundColor = useColorModeValue('blackAlpha.50', 'blackAlpha.300')
  const progressBarBackgroundColor = useColorModeValue('blackAlpha.50', 'whiteAlpha.50')

  const keepKeyWallet = wallet && isKeepKey(wallet) ? wallet : undefined

  useEffect(() => {
    setWordEntropy(() => {
      switch (recoveryEntropy) {
        case '128':
          return 12
        case '192':
          return 18
        case '256':
          return 24
        default:
          return 12
      }
    })
  }, [recoveryEntropy])

  // If an index updates we've heard back from the device
  useEffect(() => setAwaitingKeepKeyResponse(false), [recoveryCharacterIndex, recoveryWordIndex])

  // Focus on the first input field once restore action confirmed on the device
  useEffect(() => inputFields[0].current?.focus(), [awaitingDeviceInteraction, inputFields])

  const wordEntropyCircle = useMemo(() => {
    const size = 2.5
    const paddedNumber = String((recoveryWordIndex || 0) + 1).padStart(2, '0')
    return (
      <Box
        borderWidth='2px'
        borderColor={circleBorderColor}
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
  }, [circleBorderColor, recoveryWordIndex])

  const resetInputs = useCallback(() => {
    inputFields[0].current?.focus()
    setCharacterInputValues(new Array<string | undefined>(maxInputLength).fill(undefined))
  }, [inputFields])

  const handleWordSubmit = useCallback(async () => {
    const isLastWord = recoveryWordIndex === wordEntropy - 1
    // If we've entered all words in our seed phrase, tell the KeepKey we're done
    if (isLastWord) {
      history.push(KeepKeyRoutes.RecoverySettingUp)
      await keepKeyWallet?.sendCharacterDone()
      // Else send a Space to let the KeepKey know we're ready to enter the next word
    } else {
      passphrase
        ? setPassphrase([...passphrase, characterInputValues])
        : setPassphrase([characterInputValues])
      await keepKeyWallet?.sendCharacter(' ')
      resetInputs()
    }
  }, [
    recoveryWordIndex,
    history,
    keepKeyWallet,
    resetInputs,
    wordEntropy,
    passphrase,
    characterInputValues,
  ])

  const onCharacterInput = useCallback(
    async (e: KeyboardEvent) => {
      // The KeepKey is not yet ready to receive inputs
      if (awaitingKeepKeyResponse) return

      // We can't allow tabbing between inputs or the focused element gets out of sync with the KeepKey
      if (e.key === 'Tab') e.preventDefault()

      // Check if an input is valid given the current device state
      if (
        !isValidInput(
          e,
          wordEntropy,
          minInputLength,
          maxInputLength,
          recoveryCharacterIndex,
          recoveryWordIndex,
        )
      )
        return

      if (isLetter(e.key)) {
        // Handle a letter
        setCharacterInputValues(c => inputValuesReducer(c, e.key, recoveryCharacterIndex))
        setAwaitingKeepKeyResponse(true)
        await keepKeyWallet?.sendCharacter(e.key)
        return
      } else {
        // Handle a special character
        switch (e.key) {
          case ' ':
            resetInputs()
            setAwaitingKeepKeyResponse(true)
            await keepKeyWallet?.sendCharacter(' ')
            break
          case 'Backspace':
            if (recoveryCharacterIndex === 0 && passphrase) {
              const previousWord = passphrase.slice(-1)[0]
              setPassphrase(passphrase.slice(0, -1))
              setCharacterInputValues(previousWord)
              inputFields[previousWord.length - 1].current?.focus()
              setAwaitingKeepKeyResponse(true)
              await keepKeyWallet?.sendCharacterDelete()
              break
            } else {
              setCharacterInputValues(c =>
                inputValuesReducer(c, undefined, recoveryCharacterIndex - 1),
              )
              setAwaitingKeepKeyResponse(true)
              await keepKeyWallet?.sendCharacterDelete()
              break
            }
          case 'Enter':
            setAwaitingKeepKeyResponse(true)
            await handleWordSubmit()
            break
          default:
            console.error(e)
        }
      }
    },
    [
      awaitingKeepKeyResponse,
      recoveryCharacterIndex,
      recoveryWordIndex,
      handleWordSubmit,
      keepKeyWallet,
      resetInputs,
      wordEntropy,
      inputFields,
      passphrase,
    ],
  )

  // Only the next expected input field should be in focus, else we get out of sync with the KeepKey
  const preventClickIfNotCurrentIndex = (e: MouseEvent<HTMLInputElement>, inputIndex: number) => {
    if (inputIndex !== recoveryCharacterIndex) {
      e.preventDefault()
    }
  }

  const pinInputFieldProps: PinInputFieldProps = useMemo(
    () => ({
      background: inputBackgroundColor,
      autoComplete: 'off',
      pattern: '[a-z]|[A-Z]',
      onKeyDown: onCharacterInput,
    }),
    [onCharacterInput, inputBackgroundColor],
  )

  return (
    <>
      <ModalHeader>
        <Text translation={'modals.keepKey.recoverySentenceEntry.header'} />
      </ModalHeader>
      <ModalBody>
        <Text
          color='text.subtle'
          translation={'modals.keepKey.recoverySentenceEntry.body'}
          mb={4}
        />
        <AwaitKeepKey
          translation='modals.keepKey.recoverySentenceEntry.awaitingButtonPress'
          onCancel={handleCancel}
        >
          <HStack justifyContent='space-between'>
            {wordEntropyCircle}
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
              max={wordEntropy}
              value={(recoveryWordIndex || 0) + 1}
              background={progressBarBackgroundColor}
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
              isDisabled={recoveryCharacterIndex ? recoveryCharacterIndex < 3 : true}
            >
              <Text translation={'modals.keepKey.recoverySentenceEntry.button'} />
            </Button>
          </Flex>
        </AwaitKeepKey>
      </ModalBody>
    </>
  )
}
