import {
  Button,
  Flex,
  FormControl,
  Icon,
  Stack,
  Text as CText,
  useColorModeValue,
  VStack,
} from '@chakra-ui/react'
import { ethChainId } from '@shapeshiftoss/caip'
import get from 'lodash/get'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'
import { useLocation, useNavigate } from 'react-router-dom'

import { AddressBook } from '../AddressBook/AddressBook'
import { AddressInput } from '../AddressInput/AddressInput'
import type { SendInput } from '../Form'
import { SendFormFields, SendRoutes } from '../SendCommon'

import { QRCodeIcon } from '@/components/Icons/QRCode'
import { DialogBackButton } from '@/components/Modal/components/DialogBackButton'
import { DialogBody } from '@/components/Modal/components/DialogBody'
import { DialogFooter } from '@/components/Modal/components/DialogFooter'
import { DialogHeader } from '@/components/Modal/components/DialogHeader'
import { DialogTitle } from '@/components/Modal/components/DialogTitle'
import { SelectAssetRoutes } from '@/components/SelectAssets/SelectAssetCommon'
import { SlideTransition } from '@/components/SlideTransition'
import { Text } from '@/components/Text'
import { useFeatureFlag } from '@/hooks/useFeatureFlag/useFeatureFlag'
import { useModal } from '@/hooks/useModal/useModal'
import { parseAddressInputWithChainId } from '@/lib/address/address'
import {
  selectInternalAccountIdByAddress,
  selectIsAddressInAddressBook,
} from '@/state/slices/addressBookSlice/selectors'
import { selectAssetById } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

const qrCodeSx = {
  svg: {
    width: '24px',
    height: '24px',
  },
}

export const Address = () => {
  const [isValidating, setIsValidating] = useState(false)
  const navigate = useNavigate()
  const translate = useTranslate()
  const {
    setValue,
    trigger,
    formState: { errors },
  } = useFormContext<SendInput>()
  const address = useWatch<SendInput, SendFormFields.To>({ name: SendFormFields.To })
  const input = useWatch<SendInput, SendFormFields.Input>({ name: SendFormFields.Input })
  const send = useModal('send')
  const qrCode = useModal('qrCode')
  const assetId = useWatch<SendInput, SendFormFields.AssetId>({ name: SendFormFields.AssetId })
  const qrBackground = useColorModeValue('blackAlpha.200', 'whiteAlpha.200')
  const isAddressBookEnabled = useFeatureFlag('AddressBook')

  const location = useLocation()
  const isFromQrCode = useMemo(() => location.state?.isFromQrCode === true, [location.state])

  const qrCodeIcon = useMemo(
    () => (
      <Flex
        bg={qrBackground}
        borderRadius='full'
        color='text.primary'
        boxSize='44px'
        alignItems='center'
        justifyContent='center'
        sx={qrCodeSx}
      >
        <Icon as={QRCodeIcon} />
      </Flex>
    ),
    [qrBackground],
  )

  const asset = useAppSelector(state => selectAssetById(state, assetId))

  const isInAddressBookFilter = useMemo(
    () => ({ accountAddress: address, chainId: asset?.chainId }),
    [address, asset?.chainId],
  )
  const isInAddressBook = useAppSelector(state =>
    selectIsAddressInAddressBook(state, isInAddressBookFilter),
  )

  const internalAccountIdFilter = useMemo(
    () => ({ accountAddress: address, chainId: asset?.chainId }),
    [address, asset?.chainId],
  )
  const internalAccountId = useAppSelector(state =>
    selectInternalAccountIdByAddress(state, internalAccountIdFilter),
  )

  const supportsENS = asset?.chainId === ethChainId // We only support ENS resolution on ETH mainnet
  const addressError = get(errors, `${SendFormFields.Input}.message`, null)

  const showSaveButton = useMemo(() => {
    return Boolean(
      !isInAddressBook && !internalAccountId && !!address && !addressError && isAddressBookEnabled,
    )
  }, [isInAddressBook, address, addressError, isAddressBookEnabled, internalAccountId])

  useEffect(() => {
    trigger(SendFormFields.Input)
  }, [trigger])

  const handleNext = useCallback(() => navigate(SendRoutes.AmountDetails), [navigate])

  const handleBackClick = useCallback(() => {
    if (isFromQrCode) {
      navigate(SendRoutes.Scan)
      return
    }

    setValue(SendFormFields.AssetId, '')
    navigate(SendRoutes.Select, {
      state: {
        toRoute: SelectAssetRoutes.Search,
        assetId: '',
      },
    })
  }, [navigate, setValue, isFromQrCode])

  const addressInputRules = useMemo(
    () => ({
      required: true,
      validate: {
        validateAddress: async (rawInput: string) => {
          if (!asset) return
          // Don't go invalid on initial empty string
          if (rawInput === '') return

          const urlOrAddress = rawInput.trim() // trim leading/trailing spaces
          setIsValidating(true)
          setValue(SendFormFields.To, '')
          setValue(SendFormFields.VanityAddress, '')
          const { assetId, chainId } = asset
          // this does not throw, everything inside is handled
          const parseAddressInputWithChainIdArgs = {
            assetId,
            chainId,
            urlOrAddress,
            // i.e that's an address field, not an URL - we do have some relics of URLs working here but that's not expected
            // and it's half-working at the time of writing in prod, so KISS, no-one uses that anyway, can always bring back as-needed
            disableUrlParsing: true,
          }
          const { address, vanityAddress } = await parseAddressInputWithChainId(
            parseAddressInputWithChainIdArgs,
          )
          setIsValidating(false)
          // set returned values
          setValue(SendFormFields.To, address)
          setValue(SendFormFields.VanityAddress, vanityAddress)
          const invalidMessage = 'common.invalidAddress'
          return address ? true : invalidMessage
        },
      },
    }),
    [asset, setValue],
  )

  const handleCancel = useCallback(() => {
    // Sends may be done from the context of a QR code modal, or a send modal, which are similar, but effectively diff. modal refs
    send.close?.()
    qrCode.close?.()
  }, [send, qrCode])

  const handleScanQrCode = useCallback(() => {
    navigate(SendRoutes.Scan)
  }, [navigate])

  const handleClickAddressBookEntry = useCallback(
    (entryAddress: string) => {
      setValue(SendFormFields.Input, entryAddress, { shouldValidate: true })
      navigate(SendRoutes.AmountDetails)
    },
    [setValue, navigate],
  )

  const handleEmptyChange = useCallback(() => {
    setValue(SendFormFields.Input, '', { shouldValidate: true })
    setValue(SendFormFields.To, '')
    setValue(SendFormFields.VanityAddress, '')
  }, [setValue])

  if (!asset) return null

  return (
    <SlideTransition className='flex flex-col h-full'>
      <DialogHeader>
        <DialogBackButton aria-label={translate('common.back')} onClick={handleBackClick} />
        <DialogTitle textAlign='center'>
          {translate('modals.send.sendForm.sendAsset', { asset: asset.name })}
        </DialogTitle>
      </DialogHeader>
      <DialogBody height='100%'>
        <VStack spacing={4} align='stretch'>
          <FormControl>
            <AddressInput
              rules={addressInputRules}
              placeholder={translate(
                supportsENS ? 'modals.send.toAddressOrEns' : 'modals.send.toAddress',
              )}
              resolvedAddress={address}
              chainId={asset?.chainId}
              onEmptied={handleEmptyChange}
              shouldShowSaveButton={showSaveButton}
            />
          </FormControl>

          <Button
            size='lg'
            leftIcon={qrCodeIcon}
            onClick={handleScanQrCode}
            justifyContent='flex-start'
            height='auto'
            background='transparent'
            m={-2}
            my={0}
            p={2}
          >
            <VStack align='start' spacing={0}>
              <CText fontSize='md' fontWeight='medium' color='text.primary'>
                {translate('modals.send.scanQrCode')}
              </CText>
              <CText fontSize='sm' color='text.subtle'>
                {translate('modals.send.sendForm.scanQrCodeDescription')}
              </CText>
            </VStack>
          </Button>

          {isAddressBookEnabled && (
            <AddressBook chainId={asset?.chainId} onEntryClick={handleClickAddressBookEntry} />
          )}
        </VStack>
      </DialogBody>

      <DialogFooter pt={2}>
        <Stack flex={1}>
          <Button
            width='full'
            isDisabled={!address || !input || addressError}
            isLoading={isValidating}
            colorScheme={addressError && !isValidating ? 'red' : 'blue'}
            size='lg'
            onClick={handleNext}
            data-test='send-address-next-button'
          >
            <Text translation={addressError || 'common.next'} />
          </Button>
          <Button width='full' variant='ghost' size='lg' mr={3} onClick={handleCancel}>
            <Text translation='common.cancel' />
          </Button>
        </Stack>
      </DialogFooter>
    </SlideTransition>
  )
}
