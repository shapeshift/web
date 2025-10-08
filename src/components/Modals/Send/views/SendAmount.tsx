import {
  Box,
  Button,
  Flex,
  FormControl,
  FormHelperText,
  FormLabel,
  HStack,
  Icon,
  Input,
  Skeleton,
  Stack,
  Text as ChakraText,
  Text as CText,
  Tooltip,
  useMediaQuery,
  VStack,
} from '@chakra-ui/react'
import { CHAIN_NAMESPACE, ethChainId, fromAssetId } from '@shapeshiftoss/caip'
import get from 'lodash/get'
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ControllerRenderProps, FieldValues } from 'react-hook-form'
import { Controller, useFormContext, useWatch } from 'react-hook-form'
import { FaInfoCircle } from 'react-icons/fa'
import { TbSwitchVertical } from 'react-icons/tb'
import type { NumberFormatValues } from 'react-number-format'
import NumberFormat from 'react-number-format'
import { useTranslate } from 'react-polyglot'
import { useNavigate } from 'react-router-dom'

import { AddressInputWithDropdown } from '../components/AddressInputWithDropdown'
import type { SendInput } from '../Form'
import { useSendDetails } from '../hooks/useSendDetails/useSendDetails'
import { SendFormFields, SendRoutes } from '../SendCommon'

import { AccountSelectorDialog } from '@/components/AccountSelectorDialog/AccountSelectorDialog'
import { Amount } from '@/components/Amount/Amount'
import { Display } from '@/components/Display'
import { MiddleEllipsis } from '@/components/MiddleEllipsis/MiddleEllipsis'
import { DialogBackButton } from '@/components/Modal/components/DialogBackButton'
import { DialogBody } from '@/components/Modal/components/DialogBody'
import { DialogFooter } from '@/components/Modal/components/DialogFooter'
import { DialogHeader } from '@/components/Modal/components/DialogHeader'
import { DialogTitle } from '@/components/Modal/components/DialogTitle'
import { SendMaxButton } from '@/components/Modals/Send/SendMaxButton/SendMaxButton'
import { SelectAssetRoutes } from '@/components/SelectAssets/SelectAssetCommon'
import { SlideTransition } from '@/components/SlideTransition'
import { Text } from '@/components/Text/Text'
import { useLocaleFormatter } from '@/hooks/useLocaleFormatter/useLocaleFormatter'
import { useModal } from '@/hooks/useModal/useModal'
import { parseAddressInputWithChainId } from '@/lib/address/address'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import { allowedDecimalSeparators } from '@/state/slices/preferencesSlice/preferencesSlice'
import { selectAssetById } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'
import { breakpoints } from '@/theme/theme'

const accountDropdownBoxProps = { px: 0, my: 0 }
const accountDropdownButtonProps = { px: 2 }

const MAX_COSMOS_SDK_MEMO_LENGTH = 256

type RenderController = ({
  field,
}: {
  field: ControllerRenderProps<FieldValues, SendFormFields.Memo>
}) => React.ReactElement

const AmountInput = (props: any) => {
  return (
    <Input
      size='lg'
      fontSize='65px'
      lineHeight='65px'
      fontWeight='normal'
      textAlign='center'
      border='none'
      borderRadius='lg'
      bg='transparent'
      variant='unstyled'
      color={props.value ? 'text.base' : 'text.subtle'}
      {...props}
    />
  )
}

export const SendAmount = () => {
  const {
    control,
    setValue,
    trigger,
    formState: { errors },
  } = useFormContext<SendInput>()
  const navigate = useNavigate()
  const translate = useTranslate()
  const {
    number: { localeParts },
  } = useLocaleFormatter()

  const [isValidating, setIsValidating] = useState(false)
  const qrCode = useModal('qrCode')
  const sendModal = useModal('send')
  const [isUnderMd] = useMediaQuery(`(max-width: ${breakpoints.md})`, { ssr: false })

  const { accountId, assetId, to, amountCryptoPrecision, fiatAmount, memo, input } = useWatch({
    control,
  }) as Partial<SendInput>

  const asset = useAppSelector(state => selectAssetById(state, assetId ?? ''))

  const { balancesLoading, fieldName, handleSendMax, handleInputChange, isLoading, toggleIsFiat } =
    useSendDetails()

  const supportsENS = asset?.chainId === ethChainId
  const addressError = get(errors, `${SendFormFields.Input}.message`, null)

  useEffect(() => {
    trigger(SendFormFields.Input)
  }, [trigger])

  const handleNextClick = useCallback(() => navigate(SendRoutes.Confirm), [navigate])
  const handleBackClick = useCallback(() => navigate(SendRoutes.Address), [navigate])
  const handleAssetBackClick = useCallback(() => {
    setValue(SendFormFields.AssetId, '')
    navigate(SendRoutes.Select, {
      state: {
        toRoute: SelectAssetRoutes.Search,
        assetId: '',
      },
    })
  }, [navigate, setValue])

  const handleMaxClick = useCallback(async () => {
    await handleSendMax()
  }, [handleSendMax])

  const handleAccountChange = useCallback(
    (newAccountId: string) => {
      setValue(SendFormFields.AccountId, newAccountId)
    },
    [setValue],
  )

  const handleScanQrCode = useCallback(() => {
    qrCode.open({ assetId })
    sendModal.close()
  }, [qrCode, assetId, sendModal])

  const currentValue = fieldName === SendFormFields.FiatAmount ? fiatAmount : amountCryptoPrecision
  const isFiat = fieldName === SendFormFields.FiatAmount

  const displayPlaceholder = isFiat ? `${localeParts.prefix}0.00` : `0.00 ${asset?.symbol}`

  const showMemoField = useMemo(
    () => Boolean(assetId && fromAssetId(assetId).chainNamespace === CHAIN_NAMESPACE.CosmosSdk),
    [assetId],
  )

  const remainingMemoChars = useMemo(
    () => bnOrZero(MAX_COSMOS_SDK_MEMO_LENGTH - Number(memo?.length)),
    [memo],
  )

  const memoFieldError = remainingMemoChars.lt(0) && 'Characters Limit Exceeded'

  const assetMemoTranslation = useMemo(
    () => ['modals.send.sendForm.assetMemo', { assetSymbol: asset?.symbol ?? '' }],
    [asset?.symbol],
  )

  const addressInputRules = useMemo(
    () => ({
      required: true,
      validate: {
        validateAddress: async (rawInput: string) => {
          if (!asset) return
          if (rawInput === '') return

          const urlOrAddress = rawInput.trim()
          setIsValidating(true)
          setValue(SendFormFields.To, '')
          setValue(SendFormFields.VanityAddress, '')
          const { assetId, chainId } = asset
          const parseAddressInputWithChainIdArgs = {
            assetId,
            chainId,
            urlOrAddress,
            disableUrlParsing: true,
          }
          const { address, vanityAddress } = await parseAddressInputWithChainId(
            parseAddressInputWithChainIdArgs,
          )
          setIsValidating(false)
          setValue(SendFormFields.To, address)
          setValue(SendFormFields.VanityAddress, vanityAddress)
          const invalidMessage = 'common.invalidAddress'
          return address ? true : invalidMessage
        },
      },
    }),
    [asset, setValue],
  )

  const handleValueChange = useCallback(
    (onChange: (value: string) => void, value: string) => (values: NumberFormatValues) => {
      onChange(values.value)
      if (values.value !== value) handleInputChange(values.value)
    },
    [handleInputChange],
  )

  const renderController = useCallback(
    ({ field: { onChange, value } }: { field: any }) => {
      return (
        <NumberFormat
          customInput={AmountInput}
          isNumericString={true}
          decimalScale={isFiat ? undefined : asset?.precision}
          inputMode='decimal'
          thousandSeparator={localeParts.group}
          decimalSeparator={localeParts.decimal}
          allowedDecimalSeparators={allowedDecimalSeparators}
          value={value}
          placeholder={displayPlaceholder}
          prefix={isFiat ? localeParts.prefix : ''}
          onValueChange={handleValueChange(onChange, value)}
        />
      )
    },
    [
      asset?.precision,
      isFiat,
      localeParts.decimal,
      localeParts.group,
      localeParts.prefix,
      displayPlaceholder,
      handleValueChange,
    ],
  )

  const handleMemoChange = useCallback(
    (onChange: (value: string) => void) =>
      ({ target: { value } }: { target: { value: string } }) =>
        onChange(value),
    [],
  )

  const renderMemoController: RenderController = useCallback(
    ({ field: { onChange, value } }) => (
      <Input
        size='lg'
        onChange={handleMemoChange(onChange)}
        value={value}
        type='text'
        variant='filled'
        placeholder={translate('modals.send.sendForm.optionalAssetMemo', {
          assetSymbol: asset?.symbol ?? '',
        })}
      />
    ),
    [asset?.symbol, translate, handleMemoChange],
  )

  if (!asset) return null

  return (
    <SlideTransition className='flex flex-col h-full'>
      <DialogHeader>
        <Display.Mobile>
          <DialogBackButton onClick={handleBackClick} />
        </Display.Mobile>
        <Display.Desktop>
          <DialogBackButton onClick={handleAssetBackClick} />
        </Display.Desktop>
        <DialogTitle textAlign='center'>
          {translate('modals.send.sendForm.sendAsset', { asset: asset.name })}
        </DialogTitle>
      </DialogHeader>

      <DialogBody height='100%'>
        <Display.Mobile>
          <VStack spacing={6} align='stretch' height='100%'>
            <Box>
              <Flex
                p={4}
                borderRadius='2xl'
                bg='background.surface.raised.base'
                border='1px solid'
                borderColor='border.base'
                alignItems='center'
              >
                <CText me={4} lineHeight='1'>
                  {translate('modals.send.sendForm.to')}
                </CText>
                <CText fontSize='sm' color='text.primary' fontWeight='bold' lineHeight='1'>
                  <MiddleEllipsis value={to || ''} />
                </CText>
              </Flex>
            </Box>

            <Flex flex='1' alignItems='center' justifyContent='center' pb={6}>
              {balancesLoading ? (
                <Skeleton height='80px' width='100%' maxWidth='240px' mx='auto' />
              ) : (
                <FormControl>
                  {fieldName === SendFormFields.AmountCryptoPrecision && (
                    <Controller
                      name={SendFormFields.AmountCryptoPrecision}
                      control={control}
                      render={renderController}
                    />
                  )}
                  {fieldName === SendFormFields.FiatAmount && (
                    <Controller
                      name={SendFormFields.FiatAmount}
                      control={control}
                      render={renderController}
                    />
                  )}

                  <HStack justify='center' mt={2} spacing={2} onClick={toggleIsFiat}>
                    <ChakraText fontSize='sm' color='text.subtle'>
                      {isFiat ? (
                        <Amount.Crypto value={amountCryptoPrecision} symbol={asset.symbol} />
                      ) : (
                        <Amount.Fiat value={bnOrZero(fiatAmount).toFixed(2)} />
                      )}
                    </ChakraText>
                    <Button variant='ghost' size='sm' p={1} minW='auto' h='auto'>
                      <Icon as={TbSwitchVertical} fontSize='xs' color='text.subtle' />
                    </Button>
                  </HStack>
                </FormControl>
              )}
            </Flex>

            {showMemoField && (
              <FormControl mt={6} mb={4}>
                <Box display='flex' alignItems='center' justifyContent='space-between'>
                  <FormLabel color='text.subtle' display='flex' alignItems='center'>
                    <Text translation={assetMemoTranslation as [string, { assetSymbol: string }]} />
                    <Tooltip
                      placement='right'
                      label={translate('modals.send.sendForm.memoExplainer', {
                        assetSymbol: asset.symbol,
                      })}
                      fontSize='md'
                      pr={4}
                    >
                      <Box ml='5px'>
                        <FaInfoCircle />
                      </Box>
                    </Tooltip>
                  </FormLabel>
                  <FormHelperText
                    mt={0}
                    mr={3}
                    mb={2}
                    as='button'
                    type='button'
                    color={memoFieldError ? 'red.500' : 'text.subtle'}
                  >
                    {translate('modals.send.sendForm.charactersRemaining', {
                      charactersRemaining: remainingMemoChars.toString(),
                    })}
                  </FormHelperText>
                </Box>
                <Controller name={SendFormFields.Memo} render={renderMemoController} />
              </FormControl>
            )}
          </VStack>
        </Display.Mobile>

        <Display.Desktop>
          <VStack spacing={6} align='stretch' height='100%'>
            <Box>
              <AddressInputWithDropdown
                addressInputRules={addressInputRules}
                supportsENS={supportsENS}
                translate={translate}
                onScanQRCode={handleScanQrCode}
              />
            </Box>

            <Flex flex='1' alignItems='center' justifyContent='center' pb={6}>
              {balancesLoading ? (
                <Skeleton height='80px' width='100%' maxWidth='240px' mx='auto' />
              ) : (
                <FormControl>
                  {fieldName === SendFormFields.AmountCryptoPrecision && (
                    <Controller
                      name={SendFormFields.AmountCryptoPrecision}
                      control={control}
                      render={renderController}
                    />
                  )}
                  {fieldName === SendFormFields.FiatAmount && (
                    <Controller
                      name={SendFormFields.FiatAmount}
                      control={control}
                      render={renderController}
                    />
                  )}

                  <HStack justify='center' mt={2} spacing={2} onClick={toggleIsFiat}>
                    <ChakraText fontSize='sm' color='text.subtle'>
                      {isFiat ? (
                        <Amount.Crypto value={amountCryptoPrecision} symbol={asset.symbol} />
                      ) : (
                        <Amount.Fiat value={bnOrZero(fiatAmount).toFixed(2)} />
                      )}
                    </ChakraText>
                    <Button variant='ghost' size='sm' p={1} minW='auto' h='auto'>
                      <Icon as={TbSwitchVertical} fontSize='xs' color='text.subtle' />
                    </Button>
                  </HStack>
                </FormControl>
              )}
            </Flex>

            {showMemoField && (
              <FormControl mt={6} mb={4}>
                <Box display='flex' alignItems='center' justifyContent='space-between'>
                  <FormLabel color='text.subtle' display='flex' alignItems='center'>
                    <Text translation={assetMemoTranslation as [string, { assetSymbol: string }]} />
                    <Tooltip
                      placement='right'
                      label={translate('modals.send.sendForm.memoExplainer', {
                        assetSymbol: asset.symbol,
                      })}
                      fontSize='md'
                      pr={4}
                    >
                      <Box ml='5px'>
                        <FaInfoCircle />
                      </Box>
                    </Tooltip>
                  </FormLabel>
                  <FormHelperText
                    mt={0}
                    mr={3}
                    mb={2}
                    as='button'
                    type='button'
                    color={memoFieldError ? 'red.500' : 'text.subtle'}
                  >
                    {translate('modals.send.sendForm.charactersRemaining', {
                      charactersRemaining: remainingMemoChars.toString(),
                    })}
                  </FormHelperText>
                </Box>
                <Controller name={SendFormFields.Memo} render={renderMemoController} />
              </FormControl>
            )}
          </VStack>
        </Display.Desktop>
      </DialogBody>

      <DialogFooter
        borderTop='1px solid'
        borderColor='border.base'
        borderRight='1px solid'
        borderLeft='1px solid'
        borderRightColor='border.base'
        borderLeftColor='border.base'
        borderTopRadius='20'
        pt={4}
      >
        <Stack flex={1}>
          <Flex alignItems='center' justifyContent='space-between' mb={4}>
            <Flex alignItems='center'>
              <FormLabel color='text.subtle' mb={0}>
                {translate('modals.send.sendForm.from')}
              </FormLabel>
              <Box>
                <AccountSelectorDialog
                  assetId={asset.assetId}
                  defaultAccountId={accountId}
                  onChange={handleAccountChange}
                  boxProps={accountDropdownBoxProps}
                  buttonProps={accountDropdownButtonProps}
                />
              </Box>
            </Flex>

            <SendMaxButton onClick={handleMaxClick} />
          </Flex>

          <Button
            width='full'
            colorScheme={addressError && !isValidating && !isUnderMd ? 'red' : 'blue'}
            size='lg'
            onClick={handleNextClick}
            isDisabled={
              !currentValue ||
              bnOrZero(currentValue).lte(0) ||
              isLoading ||
              Boolean(memoFieldError) ||
              !to ||
              !input ||
              addressError
            }
            isLoading={isLoading || isValidating}
          >
            {translate(addressError ?? 'common.preview')}
          </Button>
        </Stack>
      </DialogFooter>
    </SlideTransition>
  )
}
