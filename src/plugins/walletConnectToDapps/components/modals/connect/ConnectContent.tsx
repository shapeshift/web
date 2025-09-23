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
  VStack,
} from '@chakra-ui/react'
import type { ClipboardEventHandler } from 'react'
import { useCallback, useMemo, useRef, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'

import { QRCodeIcon } from '@/components/Icons/QRCode'
import { WalletConnectIcon } from '@/components/Icons/WalletConnectIcon'
import { DialogCloseButton } from '@/components/Modal/components/DialogCloseButton'
import {
  DialogHeader,
  DialogHeaderLeft,
  DialogHeaderMiddle,
  DialogHeaderRight,
} from '@/components/Modal/components/DialogHeader'
import { QrCodeScanner } from '@/components/QrCodeScanner/QrCodeScanner'
import { Text } from '@/components/Text'
import { isWalletConnectV2Uri } from '@/plugins/walletConnectToDapps/components/modals/connect/utils'

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
  const inputRef = useRef<HTMLInputElement>(null)

  const toggleQrCodeView = useCallback(() => setIsQrCodeView(v => !v), [])

  const handleForm = useCallback((values: FormValues) => handleConnect(values.uri), [handleConnect])

  const { register, handleSubmit, control, formState, setValue } = useForm<FormValues>({
    mode: 'onChange',
    defaultValues: { uri: initialUri },
  })

  const blurInput = useCallback(() => {
    inputRef.current?.blur()
  }, [])

  const handleQrScanSuccess = useCallback(
    (uri: string) => {
      setValue('uri', uri)
      toggleQrCodeView()
      blurInput() // Blur the input to close keyboard on mobile
    },
    [setValue, toggleQrCodeView, blurInput],
  )

  const handleInputPaste: ClipboardEventHandler<HTMLInputElement> = useCallback(
    e => {
      e.preventDefault()
      const clipboardText = e.clipboardData?.getData('text') || ''
      setValue('uri', clipboardText)
      // Blur input after paste to close keyboard on mobile
      blurInput()
    },
    [blurInput, setValue],
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

  const { ref: registerRef, ...registerProps } = register('uri')

  const handleRefCallback = useCallback(
    (e: HTMLInputElement | null) => {
      registerRef(e)
      inputRef.current = e
    },
    [registerRef],
  )

  if (isQrCodeView) {
    return <QrCodeScanner onSuccess={handleQrScanSuccess} onBack={toggleQrCodeView} />
  }

  return (
    <>
      <DialogHeader>
        <DialogHeaderLeft></DialogHeaderLeft>
        <DialogHeaderMiddle></DialogHeaderMiddle>
        <DialogHeaderRight>
          <DialogCloseButton zIndex='1' position='absolute' color='text.subtle' />
        </DialogHeaderRight>
      </DialogHeader>
      <Box p={8}>
        <form onSubmit={handleSubmit(handleForm)}>
          <VStack spacing={8}>
            <WalletConnectIcon fontSize='9xl' />
            <Heading flex={1} fontSize='xl'>
              <Text translation='plugins.walletConnectToDapps.modal.connect.title' />
            </Heading>
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
                  {...registerProps}
                  ref={handleRefCallback}
                  autoComplete={'off'}
                  type='text'
                  placeholder={translate(
                    'plugins.walletConnectToDapps.modal.connect.linkPlaceholder',
                  )}
                  autoFocus // eslint-disable-line jsx-a11y/no-autofocus
                  variant='filled'
                  onPaste={handleInputPaste}
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
    </>
  )
}
