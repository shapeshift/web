import {
  Box,
  Button,
  Flex,
  FormControl,
  FormLabel,
  HStack,
  Icon,
  Input,
  Skeleton,
  Stack,
  Text,
  VStack,
} from '@chakra-ui/react'
import { useCallback } from 'react'
import { Controller, useFormContext, useWatch } from 'react-hook-form'
import { TbSwitchVertical } from 'react-icons/tb'
import type { NumberFormatValues } from 'react-number-format'
import NumberFormat from 'react-number-format'
import { useTranslate } from 'react-polyglot'
import { useNavigate } from 'react-router-dom'

import type { SendInput } from '../Form'
import { useSendDetails } from '../hooks/useSendDetails/useSendDetails'
import { SendFormFields, SendRoutes } from '../SendCommon'

import { AccountSelectorDialog } from '@/components/AccountSelectorDialog/AccountSelectorDialog'
import { Amount } from '@/components/Amount/Amount'
import { MiddleEllipsis } from '@/components/MiddleEllipsis/MiddleEllipsis'
import { DialogBackButton } from '@/components/Modal/components/DialogBackButton'
import { DialogBody } from '@/components/Modal/components/DialogBody'
import { DialogFooter } from '@/components/Modal/components/DialogFooter'
import { DialogHeader } from '@/components/Modal/components/DialogHeader'
import { DialogTitle } from '@/components/Modal/components/DialogTitle'
import { SendMaxButton } from '@/components/Modals/Send/SendMaxButton/SendMaxButton'
import { SlideTransition } from '@/components/SlideTransition'
import { useLocaleFormatter } from '@/hooks/useLocaleFormatter/useLocaleFormatter'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import { allowedDecimalSeparators } from '@/state/slices/preferencesSlice/preferencesSlice'
import { selectAssetById } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

const accountDropdownBoxProps = { px: 0, my: 0 }
const accountDropdownButtonProps = { px: 2 }

// Custom input component for the amount input
const AmountInput = (props: any) => {
  return (
    <Input
      size='lg'
      fontSize='65px'
      lineHeight='65px'
      fontWeight='bold'
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
  const { control, setValue } = useFormContext<SendInput>()
  const navigate = useNavigate()
  const translate = useTranslate()
  const {
    number: { localeParts },
  } = useLocaleFormatter()

  const { accountId, assetId, to, amountCryptoPrecision, fiatAmount } = useWatch({
    control,
  }) as Partial<SendInput>

  const asset = useAppSelector(state => selectAssetById(state, assetId ?? ''))

  const { balancesLoading, fieldName, handleSendMax, handleInputChange, isLoading, toggleIsFiat } =
    useSendDetails()

  const handleNextClick = useCallback(() => navigate(SendRoutes.Details), [navigate])
  const handleBackClick = useCallback(() => navigate(SendRoutes.Address), [navigate])

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

  const displayPlaceholder = isFiat ? `${localeParts.prefix}0.00` : `0.00 ${asset?.symbol}`

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
          // this is already within a useCallback
          // eslint-disable-next-line react-memo/require-usememo
          onValueChange={(values: NumberFormatValues) => {
            onChange(values.value)
            if (values.value !== value) handleInputChange(values.value)
          }}
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
      handleInputChange,
    ],
  )

  if (!asset) return null

  return (
    <SlideTransition className='flex flex-col h-full'>
      <DialogHeader>
        <DialogBackButton onClick={handleBackClick} />
        <DialogTitle textAlign='center'>
          {translate('modals.send.sendForm.sendAsset', { asset: asset.name })}
        </DialogTitle>
      </DialogHeader>

      <DialogBody height='100%'>
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
              <Text me={4} lineHeight='1'>
                {translate('modals.send.sendForm.to')}
              </Text>
              <Text fontSize='sm' color='text.primary' fontWeight='bold' lineHeight='1'>
                <MiddleEllipsis value={to || ''} />
              </Text>
            </Flex>
          </Box>

          <Flex flex='1' alignItems='center' justifyContent='center' pb={10}>
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
                  <Text fontSize='sm' color='text.subtle'>
                    {isFiat ? (
                      <Amount.Crypto value={amountCryptoPrecision} symbol={asset.symbol} />
                    ) : (
                      <Amount.Fiat value={bnOrZero(fiatAmount).toFixed(2)} />
                    )}
                  </Text>
                  <Button variant='ghost' size='sm' p={1} minW='auto' h='auto'>
                    <Icon as={TbSwitchVertical} fontSize='xs' color='text.subtle' />
                  </Button>
                </HStack>
              </FormControl>
            )}
          </Flex>
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
            colorScheme='blue'
            size='lg'
            onClick={handleNextClick}
            isDisabled={!currentValue || bnOrZero(currentValue).lte(0) || isLoading}
            isLoading={isLoading}
          >
            {translate('common.preview')}
          </Button>
        </Stack>
      </DialogFooter>
    </SlideTransition>
  )
}
