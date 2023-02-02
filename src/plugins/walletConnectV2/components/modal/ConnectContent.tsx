import {
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
import { useCallback, useState } from 'react'
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
  handleConnect: (uri: string) => void
}
export const ConnectContent: React.FC<ConnectContentProps> = ({ handleConnect }) => {
  const translate = useTranslate()
  const [isQrCodeView, setIsQrCodeView] = useState<boolean>(false)
  const toggleQrCodeView = useCallback(() => setIsQrCodeView(v => !v), [])

  const handleForm = (values: FormValues) => handleConnect(values.uri)

  const { register, handleSubmit, control, formState, setValue } = useForm<FormValues>({
    mode: 'onChange',
    defaultValues: { uri: '' },
  })
  const handleQrScanSuccess = useCallback(
    (uri: string) => {
      setValue('uri', uri)
      toggleQrCodeView()
    },
    [setValue, toggleQrCodeView],
  )
  const canConnect = !!useWatch({ control, name: 'uri' })

  if (isQrCodeView)
    return <QrCodeScanner onSuccess={handleQrScanSuccess} onBack={toggleQrCodeView} />

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
                  icon={<QRCodeIcon />}
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
          <Button
            isDisabled={!canConnect}
            colorScheme='blue'
            size='lg'
            width='full'
            type='submit'
            variant='solid'
            isLoading={formState.isSubmitting}
          >
            {translate('plugins.walletConnectToDapps.modal.connect.connect')}
          </Button>
        </VStack>
      </form>
    </Box>
  )
}
