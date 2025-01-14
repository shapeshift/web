import {
  Alert,
  AlertDescription,
  Box,
  Button,
  FormControl,
  FormErrorMessage,
  Heading,
  IconButton,
  Input,
  InputGroup,
  InputRightElement,
  Link,
  VStack,
} from '@chakra-ui/react'
import { isWalletConnectV2Uri } from 'plugins/walletConnectToDapps/components/modals/connect/utils'
import { useCallback, useMemo, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'
import { QRCodeIcon } from 'components/Icons/QRCode'
import { WalletConnectIcon } from 'components/Icons/WalletConnectIcon'
import { QrCodeScanner } from 'components/QrCodeScanner/QrCodeScanner'
import { Text } from 'components/Text'

type FormValues = {
  uri: string
}

type ConnectContentProps = {
  initialUri?: string
  handleConnect: (uri: string) => void
}

const qrCodeIcon = <QRCodeIcon />

export const ConnectContent: React.FC<ConnectContentProps> = ({
  initialUri = '',
  handleConnect,
}) => {
  const translate = useTranslate()
  const [isQrCodeView, setIsQrCodeView] = useState<boolean>(false)
  const toggleQrCodeView = useCallback(() => setIsQrCodeView(v => !v), [])

  const handleForm = useCallback((values: FormValues) => handleConnect(values.uri), [handleConnect])

  const { register, handleSubmit, control, formState, setValue } = useForm<FormValues>({
    mode: 'onChange',
    defaultValues: { uri: initialUri },
  })

  const handleQrScanSuccess = useCallback(
    (uri: string) => {
      setValue('uri', uri)
      toggleQrCodeView()
    },
    [setValue, toggleQrCodeView],
  )

  const uri = useWatch({ control, name: 'uri' })
  const isValidUri = isWalletConnectV2Uri(uri)

  const connectTranslation = useMemo(() => {
    const commonString = 'plugins.walletConnectToDapps.modal.connect'
    switch (true) {
      case uri === '':
        return `${commonString}.connect`
      case !isValidUri:
        return `${commonString}.invalidUri`
      default:
        return `${commonString}.connect`
    }
  }, [isValidUri, uri])

  if (isQrCodeView) {
    return <QrCodeScanner onSuccess={handleQrScanSuccess} onBack={toggleQrCodeView} />
  }

  return (
    <Box p={8}>
      <form onSubmit={handleSubmit(handleForm)}>
        <VStack spacing={8}>
          <WalletConnectIcon fontSize='9xl' />
          <Heading flex={1} fontSize='xl'>
            <Text translation='plugins.walletConnectToDapps.modal.connect.title' />
          </Heading>
          <Link href='#' target='_blank'>
            <Button colorScheme='blue' variant='link'>
              {translate('plugins.walletConnectToDapps.modal.connect.howTo')}
            </Button>
          </Link>

          <FormControl isInvalid={Boolean(formState.errors.uri)} mb={6}>
            <InputGroup size='lg'>
              <InputRightElement>
                <IconButton
                  aria-label={translate('modals.send.scanQrCode')}
                  icon={qrCodeIcon}
                  onClick={toggleQrCodeView}
                  size='sm'
                  variant='ghost'
                />
              </InputRightElement>
              <Input
                {...register('uri')}
                autoComplete={'off'}
                type='text'
                placeholder={translate(
                  'plugins.walletConnectToDapps.modal.connect.linkPlaceholder',
                )}
                autoFocus // eslint-disable-line jsx-a11y/no-autofocus
                variant='filled'
              />
            </InputGroup>
            <FormErrorMessage>{formState.errors?.uri?.message}</FormErrorMessage>
          </FormControl>
          <Alert status='warning'>
            <AlertDescription>
              {translate('plugins.walletConnectToDapps.modal.connect.disclaimerBody')}
            </AlertDescription>
          </Alert>
          <Button
            isDisabled={!isValidUri}
            colorScheme='blue'
            size='lg'
            width='full'
            type='submit'
            variant='solid'
            isLoading={formState.isSubmitting}
          >
            {translate(connectTranslation)}
          </Button>
        </VStack>
      </form>
    </Box>
  )
}
