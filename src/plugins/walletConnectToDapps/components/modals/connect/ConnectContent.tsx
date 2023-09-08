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
import type { AssetId } from '@shapeshiftoss/caip'
import { ethAssetId } from '@shapeshiftoss/caip'
import {
  isValidWalletConnectUri,
  isWalletConnectV1Uri,
  isWalletConnectV2Uri,
} from 'plugins/walletConnectToDapps/components/modals/connect/utils'
import { useWalletConnect } from 'plugins/walletConnectToDapps/v1/WalletConnectBridgeContext'
import { useCallback, useMemo, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'
import { AccountDropdown } from 'components/AccountDropdown/AccountDropdown'
import { QRCodeIcon } from 'components/Icons/QRCode'
import { WalletConnectIcon } from 'components/Icons/WalletConnectIcon'
import { QrCodeScanner } from 'components/QrCodeScanner/QrCodeScanner'
import { Text } from 'components/Text'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { useFeatureFlag } from 'hooks/useFeatureFlag/useFeatureFlag'

type FormValues = {
  uri: string
}

type ConnectContentProps = {
  initialUri?: string
  handleConnect: (uri: string) => void
}
export const ConnectContent: React.FC<ConnectContentProps> = ({
  initialUri = '',
  handleConnect,
}) => {
  const translate = useTranslate()
  const [isQrCodeView, setIsQrCodeView] = useState<boolean>(false)
  const toggleQrCodeView = useCallback(() => setIsQrCodeView(v => !v), [])
  const { evmChainId, setWcAccountId } = useWalletConnect()

  const isWalletConnectToDappsV1Enabled = useFeatureFlag('WalletConnectToDapps')
  const isWalletConnectToDappsV2Enabled = useFeatureFlag('WalletConnectToDappsV2')

  const handleForm = (values: FormValues) => handleConnect(values.uri)

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
  const isWalletConnectV1 = isWalletConnectV1Uri(uri)
  const isWalletConnectV2 = isWalletConnectV2Uri(uri)
  const isValidUri = isValidWalletConnectUri(uri)

  const feeAssetId: AssetId = useMemo(() => {
    if (!evmChainId) return ethAssetId
    const chainAdapter = getChainAdapterManager().get(evmChainId)
    if (!chainAdapter) return ethAssetId
    return chainAdapter.getFeeAssetId()
  }, [evmChainId])

  if (isQrCodeView)
    return <QrCodeScanner onSuccess={handleQrScanSuccess} onBack={toggleQrCodeView} />

  const connectTranslation = (() => {
    const commonString = 'plugins.walletConnectToDapps.modal.connect'
    switch (true) {
      case uri === '':
        return `${commonString}.connect`
      case isWalletConnectV1 && !isWalletConnectToDappsV1Enabled:
        return `${commonString}.v1UriUnsupported`
      case isWalletConnectV2 && !isWalletConnectToDappsV2Enabled:
        return `${commonString}.v2UriUnsupported`
      case !isValidUri:
        return `${commonString}.invalidUri`
      default:
        return `${commonString}.connect`
    }
  })()

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
            {!isWalletConnectV2 && (
              <AccountDropdown
                buttonProps={{ width: 'full', ml: 0, mr: 0 }}
                assetId={feeAssetId}
                onChange={setWcAccountId}
              />
            )}
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
