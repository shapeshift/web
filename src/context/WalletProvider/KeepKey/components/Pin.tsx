import type { ButtonProps, SimpleGridProps } from '@chakra-ui/react'
import { Alert, AlertDescription, AlertIcon, Button, Input, SimpleGrid } from '@chakra-ui/react'
import type { Event } from '@shapeshiftoss/hdwallet-core'
import type { KeyboardEvent } from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { CircleIcon } from 'components/Icons/Circle'
import { Text } from 'components/Text'
import { WalletActions } from 'context/WalletProvider/actions'
import { FailureType, MessageType } from 'context/WalletProvider/KeepKey/KeepKeyTypes'
import { useWallet } from 'hooks/useWallet/useWallet'

type KeepKeyPinProps = {
  translationType: string
  gridMaxWidth?: string | number
  confirmButtonSize?: string
  buttonsProps?: ButtonProps
  gridProps?: SimpleGridProps
}

const pinNumbers = [7, 8, 9, 4, 5, 6, 1, 2, 3]

export const KeepKeyPin = ({
  translationType,
  gridMaxWidth,
  confirmButtonSize,
  buttonsProps,
  gridProps,
}: KeepKeyPinProps) => {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [isPinEmpty, setIsPinEmpty] = useState(true)
  const {
    setDeviceState,
    state: {
      keyring,
      deviceId,
      deviceState: { disposition },
    },
    dispatch,
  } = useWallet()
  const wallet = keyring.get(deviceId ?? '')

  const pinFieldRef = useRef<HTMLInputElement | null>(null)

  const handlePinPress = useCallback(
    (value: number) => {
      if (pinFieldRef?.current) {
        pinFieldRef.current.value += value.toString()
      }
    },
    [pinFieldRef],
  )

  const handleSubmit = useCallback(async () => {
    setError(null)
    setDeviceState({
      isDeviceLoading: true,
    })
    setLoading(true)
    const pin = pinFieldRef.current?.value
    if (pin && pin.length > 0) {
      try {
        // The event handler will pick up the response to the sendPin request
        await wallet?.sendPin(pin)
        switch (disposition) {
          case 'recovering':
            setDeviceState({ awaitingDeviceInteraction: true })
            dispatch({
              type: WalletActions.OPEN_KEEPKEY_CHARACTER_REQUEST,
              payload: {
                characterPos: undefined,
                wordPos: undefined,
              },
            })
            break
          default:
            dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: false })
            break
        }
      } catch (e) {
        console.error(e)
      } finally {
        if (pinFieldRef?.current) {
          pinFieldRef.current.value = ''
        }
        setLoading(false)
      }
    }
  }, [dispatch, disposition, setDeviceState, wallet])

  const handleKeyboardInput = useCallback(
    (e: KeyboardEvent) => {
      // We can't allow tabbing between inputs or the focused element gets out of sync with the KeepKey
      if (e.key === 'Tab') e.preventDefault()

      if (e.key === 'Backspace') return

      if (e.key === 'Enter') {
        handleSubmit()
        return
      }

      if (!pinNumbers.includes(Number(e.key))) {
        e.preventDefault()
        return
      } else {
        e.preventDefault()
        handlePinPress(Number(e.key))
        return
      }
    },
    [handlePinPress, handleSubmit],
  )

  useEffect(() => {
    /**
     * Handle errors reported by the KeepKey
     * Specifically look for PIN errors that are relevant to this modal
     */
    const handleError = (e: Event) => {
      if (e.message_enum === MessageType.FAILURE) {
        switch (e.message?.code as FailureType) {
          // Device has a programmed PIN
          case FailureType.PININVALID:
            setError(`walletProvider.keepKey.errors.pinInvalid`)
            break
          // A "cancel" command was sent while showing the PIN screen on the KK
          case FailureType.PINCANCELLED:
            setError(`walletProvider.keepKey.errors.pinCancelled`)
            break
          // Creating a NEW PIN, the user didn't enter the same PIN in steps 1 and 2
          case FailureType.PINMISMATCH:
            setError(`walletProvider.keepKey.errors.pinMismatch`)
            break
          default:
            setError('walletProvider.keepKey.errors.unknown')
        }
      }
    }

    keyring.on(['KeepKey', deviceId ?? '', String(MessageType.FAILURE)], handleError)

    return () => {
      keyring.off(['KeepKey', deviceId ?? '', String(MessageType.FAILURE)], handleError)
    }
  }, [deviceId, keyring])

  useEffect(() => {
    pinFieldRef.current?.focus()
  }, [])

  return (
    <>
      <Text color='text.subtle' translation={`walletProvider.keepKey.${translationType}.body`} />
      <SimpleGrid
        columns={3}
        spacing={6}
        my={6}
        maxWidth={gridMaxWidth ?? '250px'}
        ml='auto'
        mr='auto'
        {...gridProps}
      >
        {pinNumbers.map(number => (
          <Button
            key={number}
            size={'lg'}
            p={8}
            // we need to pass an arg here, so we need an anonymous function wrapper
            // eslint-disable-next-line react-memo/require-usememo
            onClick={() => {
              handlePinPress(number)
              setIsPinEmpty(!pinFieldRef.current?.value)
            }}
            {...buttonsProps}
          >
            <CircleIcon boxSize={4} />
          </Button>
        ))}
      </SimpleGrid>
      <Input
        type='password'
        ref={pinFieldRef}
        size='lg'
        variant='filled'
        mb={6}
        autoComplete='one-time-code'
        onKeyDown={handleKeyboardInput}
        // we need to pass an arg here, so we need an anonymous function wrapper
        // eslint-disable-next-line react-memo/require-usememo
        onKeyUp={() => setIsPinEmpty(!pinFieldRef.current?.value)}
      />
      {error && (
        <Alert status='error'>
          <AlertIcon />
          <AlertDescription>
            <Text translation={error} />
          </AlertDescription>
        </Alert>
      )}
      <Button
        width='full'
        size={confirmButtonSize ?? 'lg'}
        colorScheme='blue'
        onClick={handleSubmit}
        isDisabled={loading || isPinEmpty}
      >
        <Text translation={`walletProvider.keepKey.${translationType}.button`} />
      </Button>
    </>
  )
}
