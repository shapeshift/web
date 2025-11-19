import {
  Alert,
  AlertIcon,
  Button,
  FormControl,
  FormHelperText,
  FormLabel,
  HStack,
  ModalBody,
  ModalHeader,
  PinInput,
  PinInputField,
  Spinner,
  VStack,
} from '@chakra-ui/react'
import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'

const SPINNER_ELEMENT = <Spinner color='white' />

type PairProps = {
  pairingCode: string
  onPairingCodeChange: (value: string) => void
  error: string | null
  isLoading: boolean
  onSubmit: (e: React.FormEvent) => void
  onCancel: () => void
}

export const Pair = ({
  pairingCode,
  onPairingCodeChange,
  error,
  isLoading,
  onSubmit,
  onCancel,
}: PairProps) => {
  const translate = useTranslate()

  const errorAlert = useMemo(() => {
    if (!error) return null

    return (
      <Alert status='error'>
        <AlertIcon />
        {error}
      </Alert>
    )
  }, [error])

  return (
    <>
      <ModalHeader>{translate('walletProvider.gridplus.pair.header')}</ModalHeader>
      <ModalBody>
        <form onSubmit={onSubmit}>
          <VStack spacing={4} align='stretch'>
            <FormControl>
              <FormLabel>{translate('walletProvider.gridplus.pair.pairingCode')}</FormLabel>
              <HStack spacing={2}>
                <PinInput
                  type='alphanumeric'
                  value={pairingCode}
                  onChange={onPairingCodeChange}
                  isDisabled={isLoading}
                  otp
                  placeholder='_'
                  autoFocus
                >
                  {Array.from({ length: 8 }).map((_, i) => (
                    <PinInputField key={i} />
                  ))}
                </PinInput>
              </HStack>
              <FormHelperText>
                {translate('walletProvider.gridplus.pair.pairingCodeHelper')}
              </FormHelperText>
            </FormControl>
            {errorAlert}
            <Button
              width='full'
              colorScheme='blue'
              type='submit'
              isLoading={isLoading}
              loadingText={translate('walletProvider.gridplus.connect.connecting')}
              spinner={SPINNER_ELEMENT}
              isDisabled={isLoading || pairingCode.length !== 8}
            >
              {translate('walletProvider.gridplus.pair.button')}
            </Button>
            <Button variant='ghost' type='button' onClick={onCancel}>
              {translate('walletProvider.gridplus.pair.cancel')}
            </Button>
          </VStack>
        </form>
      </ModalBody>
    </>
  )
}
