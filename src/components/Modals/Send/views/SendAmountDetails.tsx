import {
  Alert,
  AlertIcon,
  Box,
  Button,
  Flex,
  FormControl,
  FormHelperText,
  FormLabel,
  Input,
  Skeleton,
  Stack,
  Tooltip,
  VStack,
} from '@chakra-ui/react'
import { CHAIN_NAMESPACE, ethChainId, fromAssetId } from '@shapeshiftoss/caip'
import get from 'lodash/get'
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ControllerRenderProps, FieldValues } from 'react-hook-form'
import { Controller, useFormContext, useWatch } from 'react-hook-form'
import { FaInfoCircle } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'
import { useLocation, useNavigate } from 'react-router-dom'

import type { SendInput } from '../Form'
import { useSendDetails } from '../hooks/useSendDetails/useSendDetails'
import { SendFormFields, SendRoutes } from '../SendCommon'

import { AccountSelector } from '@/components/AccountSelector/AccountSelector'
import { CryptoFiatInput } from '@/components/CryptoFiatInput/CryptoFiatInput'
import { DialogBackButton } from '@/components/Modal/components/DialogBackButton'
import { DialogBody } from '@/components/Modal/components/DialogBody'
import { DialogFooter } from '@/components/Modal/components/DialogFooter'
import { DialogHeader } from '@/components/Modal/components/DialogHeader'
import { DialogTitle } from '@/components/Modal/components/DialogTitle'
import { AddressInput } from '@/components/Modals/Send/AddressInput/AddressInput'
import { SendMaxButton } from '@/components/Modals/Send/SendMaxButton/SendMaxButton'
import { SlideTransition } from '@/components/SlideTransition'
import { Text } from '@/components/Text/Text'
import { parseAddressInputWithChainId } from '@/lib/address/address'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import { selectAssetById } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

const accountDropdownBoxProps = { px: 0, my: 0 }
const accountDropdownButtonProps = { px: 2 }

// Maximum memo length for Cosmos SDK chains (256 characters)
// Currently only Cosmos SDK chains support memos in the send flow
const MAX_MEMO_LENGTH = 256

type RenderController = ({
  field,
}: {
  field: ControllerRenderProps<FieldValues, SendFormFields.Memo>
}) => React.ReactElement

export const SendAmountDetails = () => {
  const {
    control,
    setValue,
    trigger,
    formState: { errors },
  } = useFormContext<SendInput>()
  const navigate = useNavigate()
  const location = useLocation()
  const translate = useTranslate()

  const [isValidating, setIsValidating] = useState(false)

  const isFromQrCode = useMemo(() => location.state?.isFromQrCode === true, [location.state])

  const {
    accountId,
    assetId,
    to,
    amountCryptoPrecision,
    fiatAmount,
    memo,
    input,
    amountFieldError,
  } = useWatch({
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

  // Clear derived address fields when input is emptied
  useEffect(() => {
    if (input === '' || input === undefined) {
      setValue(SendFormFields.To, '')
      setValue(SendFormFields.VanityAddress, '')
    }
  }, [input, setValue])

  const handleNextClick = useCallback(() => navigate(SendRoutes.Confirm), [navigate])
  const handleBackClick = useCallback(
    () => navigate(isFromQrCode ? SendRoutes.Scan : SendRoutes.Address),
    [navigate, isFromQrCode],
  )

  const handleMaxClick = useCallback(async () => {
    await handleSendMax()
  }, [handleSendMax])

  const handleAccountChange = useCallback(
    (newAccountId: string) => {
      setValue(SendFormFields.AccountId, newAccountId)
    },
    [setValue],
  )

  const currentValue = fieldName === SendFormFields.FiatAmount ? fiatAmount : amountCryptoPrecision
  const isFiat = fieldName === SendFormFields.FiatAmount

  const showMemoField = useMemo(
    () => Boolean(assetId && fromAssetId(assetId).chainNamespace === CHAIN_NAMESPACE.CosmosSdk),
    [assetId],
  )

  const remainingMemoChars = useMemo(() => bnOrZero(MAX_MEMO_LENGTH - Number(memo?.length)), [memo])

  const memoFieldError = remainingMemoChars.lt(0)

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
        <DialogBackButton aria-label={translate('common.back')} onClick={handleBackClick} />
        <DialogTitle textAlign='center'>
          {translate('modals.send.sendForm.sendAsset', { asset: asset.name })}
        </DialogTitle>
      </DialogHeader>

      <DialogBody height='100%'>
        <VStack spacing={6} align='stretch' height='100%'>
          <Box>
            <AddressInput
              rules={addressInputRules}
              placeholder={translate(
                supportsENS ? 'modals.send.toAddressOrEns' : 'modals.send.toAddress',
              )}
              resolvedAddress={to}
              chainId={asset?.chainId}
              isReadOnly
              onClick={handleBackClick}
            />
          </Box>
          <Flex flex='1' alignItems='center' justifyContent='center' pb={6}>
            {balancesLoading ? (
              <Skeleton height='80px' width='100%' maxWidth='240px' mx='auto' />
            ) : (
              <CryptoFiatInput
                asset={asset}
                handleInputChange={handleInputChange}
                fieldName={fieldName}
                toggleIsFiat={toggleIsFiat}
                isFiat={isFiat}
                control={control}
                fiatAmount={fiatAmount}
                cryptoAmount={amountCryptoPrecision}
              />
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
          {amountFieldError && (
            <Alert status='error' borderRadius='lg' mb={3}>
              <AlertIcon />
              <Text translation={amountFieldError} fontSize='sm' />
            </Alert>
          )}
          <Flex alignItems='center' justifyContent='space-between' mb={4}>
            <Flex alignItems='center'>
              <FormLabel color='text.subtle' mb={0}>
                {translate('trade.from')}
              </FormLabel>
              <Box>
                <AccountSelector
                  assetId={asset.assetId}
                  accountId={accountId}
                  onChange={handleAccountChange}
                  boxProps={accountDropdownBoxProps}
                  buttonProps={accountDropdownButtonProps}
                />
              </Box>
            </Flex>
            <SendMaxButton onClick={handleMaxClick} isDisabled={!Boolean(to)} />
          </Flex>
          <Button
            width='full'
            colorScheme={addressError && !isValidating ? 'red' : 'blue'}
            size='lg'
            onClick={handleNextClick}
            isDisabled={
              !currentValue ||
              bnOrZero(currentValue).lte(0) ||
              isLoading ||
              Boolean(amountFieldError) ||
              Boolean(memoFieldError) ||
              !to ||
              !input ||
              addressError
            }
            isLoading={isLoading || isValidating}
          >
            {translate(Boolean(addressError) ? addressError : 'common.preview')}
          </Button>
        </Stack>
      </DialogFooter>
    </SlideTransition>
  )
}
