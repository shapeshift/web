import {
  Alert,
  AlertIcon,
  Button,
  FormControl,
  FormHelperText,
  FormLabel,
  HStack,
  Input,
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

type SetupProps = {
  showPairingCode?: boolean
  pairingCode?: string
  onPairingCodeChange?: (value: string) => void
  safeCardName: string
  onSafeCardNameChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  error: string | null
  isLoading: boolean
  onSubmit: (e: React.FormEvent) => void
}

export const Setup = ({
  showPairingCode = false,
  pairingCode = '',
  onPairingCodeChange,
  safeCardName,
  onSafeCardNameChange,
  error,
  isLoading,
  onSubmit,
}: SetupProps) => {
  const translate = useTranslate()

  const isSubmitDisabled = showPairingCode ? pairingCode.length !== 8 : false

  const errorAlert = useMemo(
    () =>
      error && (
        <Alert status='error'>
          <AlertIcon />
          {error}
        </Alert>
      ),
    [error],
  )

  const pairingCodeSection = useMemo(
    () =>
      showPairingCode && (
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
              autoFocus={showPairingCode}
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
      ),
    [showPairingCode, pairingCode, onPairingCodeChange, isLoading, translate],
  )

  return (
    <>
      <ModalHeader>
        {showPairingCode
          ? translate('walletProvider.gridplus.pair.header')
          : translate('walletProvider.gridplus.name.header')}
      </ModalHeader>
      <ModalBody>
        <form onSubmit={onSubmit}>
          <VStack spacing={4} align='stretch'>
            {pairingCodeSection}
            <FormControl>
              <FormLabel>{translate('walletProvider.gridplus.name.label')}</FormLabel>
              <Input
                placeholder={translate('walletProvider.gridplus.name.placeholder')}
                value={safeCardName}
                onChange={onSafeCardNameChange}
                isDisabled={isLoading}
                autoFocus={!showPairingCode}
              />
              <FormHelperText>{translate('walletProvider.gridplus.name.helper')}</FormHelperText>
            </FormControl>
            {errorAlert}
            <Button
              width='full'
              colorScheme='blue'
              type='submit'
              isLoading={isLoading}
              loadingText={translate('walletProvider.gridplus.connect.connecting')}
              spinner={SPINNER_ELEMENT}
              isDisabled={isLoading || isSubmitDisabled}
            >
              {showPairingCode
                ? translate('walletProvider.gridplus.pair.button')
                : translate('common.done')}
            </Button>
          </VStack>
        </form>
      </ModalBody>
    </>
  )
}
