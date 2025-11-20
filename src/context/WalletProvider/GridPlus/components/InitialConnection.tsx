import {
  Alert,
  AlertIcon,
  Button,
  FormControl,
  FormHelperText,
  FormLabel,
  Input,
  ModalBody,
  ModalHeader,
  Spinner,
  VStack,
} from '@chakra-ui/react'
import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'

const SPINNER_ELEMENT = <Spinner color='white' />

type InitialConnectionProps = {
  physicalDeviceId: string | null
  deviceId: string
  onDeviceIdChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  error: string | null
  isLoading: boolean
  isAddingNew: boolean
  onSubmit: (e: React.FormEvent) => void
  onBackToList: () => void
}

export const InitialConnection = ({
  physicalDeviceId,
  deviceId,
  onDeviceIdChange,
  error,
  isLoading,
  isAddingNew,
  onSubmit,
  onBackToList,
}: InitialConnectionProps) => {
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

  const deviceIdInput = useMemo(() => {
    if (physicalDeviceId) return null

    return (
      <FormControl>
        <FormLabel>{translate('walletProvider.gridplus.connect.deviceId')}</FormLabel>
        <Input
          placeholder={translate('walletProvider.gridplus.connect.deviceIdPlaceholder')}
          value={deviceId}
          onChange={onDeviceIdChange}
          isDisabled={isLoading}
          type='text'
          autoComplete='off'
          autoFocus
        />
        <FormHelperText>
          {translate('walletProvider.gridplus.connect.deviceIdHelper')}
        </FormHelperText>
      </FormControl>
    )
  }, [physicalDeviceId, deviceId, onDeviceIdChange, isLoading, translate])

  return (
    <>
      <ModalHeader>{translate('walletProvider.gridplus.connect.header')}</ModalHeader>
      <ModalBody>
        <form onSubmit={onSubmit}>
          <VStack spacing={4} align='stretch'>
            {deviceIdInput}
            {errorAlert}
            <Button
              width='full'
              colorScheme='blue'
              type='submit'
              isLoading={isLoading}
              loadingText={translate('walletProvider.gridplus.connect.connecting')}
              spinner={SPINNER_ELEMENT}
              isDisabled={isLoading || (!physicalDeviceId && !deviceId)}
            >
              {translate('walletProvider.gridplus.connect.button')}
            </Button>
            {isAddingNew && (
              <Button variant='ghost' type='button' onClick={onBackToList}>
                {translate('walletProvider.gridplus.connect.backToList')}
              </Button>
            )}
          </VStack>
        </form>
      </ModalBody>
    </>
  )
}
