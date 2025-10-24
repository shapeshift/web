import {
  Box,
  Button,
  IconButton,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
} from '@chakra-ui/react'
import type { Asset } from '@shapeshiftoss/types'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { FormProvider, useForm, useFormContext, useWatch } from 'react-hook-form'
import { TbX } from 'react-icons/tb'
import { useTranslate } from 'react-polyglot'

import { CryptoFiatInput } from '@/components/CryptoFiatInput/CryptoFiatInput'
import { Display } from '@/components/Display'
import { DialogBody } from '@/components/Modal/components/DialogBody'
import { DialogFooter } from '@/components/Modal/components/DialogFooter'
import { DialogHeader } from '@/components/Modal/components/DialogHeader'
import { Text } from '@/components/Text'
import { useModalRegistration } from '@/context/ModalStackProvider'
import { bn, bnOrZero } from '@/lib/bignumber/bignumber'
import { selectMarketDataByAssetIdUserCurrency } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

enum ReceiveAmountFormFields {
  AmountCryptoPrecision = 'amountCryptoPrecision',
  FiatAmount = 'fiatAmount',
}

type ReceiveAmountInput = {
  [ReceiveAmountFormFields.AmountCryptoPrecision]: string
  [ReceiveAmountFormFields.FiatAmount]: string
}

type AmountFieldName =
  | ReceiveAmountFormFields.AmountCryptoPrecision
  | ReceiveAmountFormFields.FiatAmount

const closeIcon = <TbX />

type ReceiveAmountContentProps = {
  onClose: () => void
  asset: Asset
  currentAmount?: string
  onConfirm: (amount: string | undefined) => void
  isModal?: boolean
}

const ReceiveAmountContent = ({
  onClose,
  asset,
  onConfirm,
  currentAmount,
  isModal = false,
}: ReceiveAmountContentProps) => {
  const { control, setValue } = useFormContext<ReceiveAmountInput>()
  const [fieldName, setFieldName] = useState<AmountFieldName>(
    ReceiveAmountFormFields.AmountCryptoPrecision,
  )
  const { amountCryptoPrecision, fiatAmount } = useWatch({
    control,
  }) as ReceiveAmountInput
  const translate = useTranslate()

  const marketDataUserCurrency = useAppSelector(state =>
    selectMarketDataByAssetIdUserCurrency(state, asset.assetId),
  )
  const price = useMemo(() => marketDataUserCurrency?.price ?? 0, [marketDataUserCurrency])
  const isFiat = fieldName === ReceiveAmountFormFields.FiatAmount
  const currentValue = isFiat ? fiatAmount : amountCryptoPrecision

  useEffect(() => {
    const initialFiat = currentAmount && bnOrZero(currentAmount).times(bnOrZero(price)).toFixed()
    setValue(ReceiveAmountFormFields.AmountCryptoPrecision, currentAmount ?? '')
    setValue(ReceiveAmountFormFields.FiatAmount, initialFiat ?? '')
  }, [currentAmount, setValue, price])

  const toggleIsFiat = useCallback(() => {
    setFieldName(
      fieldName === ReceiveAmountFormFields.FiatAmount
        ? ReceiveAmountFormFields.AmountCryptoPrecision
        : ReceiveAmountFormFields.FiatAmount,
    )
  }, [fieldName])

  const handleInputChange = useCallback(
    (inputValue: string) => {
      const otherField =
        fieldName !== ReceiveAmountFormFields.FiatAmount
          ? ReceiveAmountFormFields.FiatAmount
          : ReceiveAmountFormFields.AmountCryptoPrecision

      if (inputValue === '') {
        setValue(otherField, '')
        return
      }

      const cryptoAmount =
        fieldName === ReceiveAmountFormFields.FiatAmount
          ? bn(inputValue).div(bnOrZero(price))
          : inputValue
      const fiatAmount =
        fieldName === ReceiveAmountFormFields.FiatAmount
          ? inputValue
          : bn(inputValue).times(bnOrZero(price))
      const otherAmount =
        fieldName === ReceiveAmountFormFields.FiatAmount
          ? bnOrZero(cryptoAmount).toFixed()
          : bnOrZero(fiatAmount).toFixed()

      setValue(otherField, otherAmount)
    },
    [fieldName, price, setValue],
  )

  const handleConfirm = useCallback(() => {
    onConfirm(amountCryptoPrecision)
    onClose()
  }, [amountCryptoPrecision, onConfirm, onClose])

  const handleClear = useCallback(() => {
    onConfirm(undefined)
    onClose()
  }, [onConfirm, onClose])

  return (
    <>
      <Display.Mobile>
        <DialogHeader>
          <DialogHeader.Middle>
            <Text fontSize='lg' fontWeight='semibold' translation={'modals.receive.setAmount'} />
          </DialogHeader.Middle>
          <DialogHeader.Right>
            <IconButton
              icon={closeIcon}
              aria-label='Close'
              variant='ghost'
              size='sm'
              onClick={onClose}
            />
          </DialogHeader.Right>
        </DialogHeader>
        <DialogBody height='100%' alignContent='center'>
          <Box flex={1} p={6} display='flex' flexDirection='column' justifyContent='center'>
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
            <Text
              textAlign='center'
              fontSize='sm'
              color='text.subtle'
              mt={6}
              translation={'modals.receive.amountNote'}
            />
          </Box>
        </DialogBody>
        <DialogFooter>
          <Button variant='ghost' flex={1} size='lg' onClick={onClose}>
            {translate('common.cancel')}
          </Button>
          {currentAmount && (
            <Button variant='ghost' flex={1} size='lg' onClick={handleClear}>
              {translate('common.clear')}
            </Button>
          )}
          <Button
            colorScheme='blue'
            flex={1}
            size='lg'
            onClick={handleConfirm}
            isDisabled={!bnOrZero(currentValue).gt(0)}
          >
            {translate('common.confirm')}
          </Button>
        </DialogFooter>
      </Display.Mobile>
      {isModal && (
        <Display.Desktop>
          <ModalHeader>
            <Text textAlign='center' translation={'modals.receive.setAmount'} fontSize='md' />
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
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
            <Text
              textAlign='center'
              fontSize='sm'
              color='text.subtle'
              my={4}
              translation={'modals.receive.amountNote'}
            />
          </ModalBody>
          <ModalFooter
            borderTop='1px solid'
            borderColor='border.base'
            borderRight='1px solid'
            borderLeft='1px solid'
            borderRightColor='border.base'
            borderLeftColor='border.base'
            borderTopRadius='20'
            pt={4}
          >
            <Button variant='ghost' mr={3} onClick={onClose}>
              {translate('common.cancel')}
            </Button>
            {currentAmount && (
              <Button variant='ghost' mr={3} onClick={handleClear}>
                {translate('common.clear')}
              </Button>
            )}
            <Button
              colorScheme='blue'
              onClick={handleConfirm}
              isDisabled={!bnOrZero(currentValue).gt(0)}
            >
              {translate('common.confirm')}
            </Button>
          </ModalFooter>
        </Display.Desktop>
      )}
    </>
  )
}

type ReceiveAmountProps = {
  onClose: () => void
  asset: Asset
  currentAmount?: string
  onConfirm: (amount: string | undefined) => void
  isModal?: boolean
}

export const ReceiveAmount = ({
  onClose,
  onConfirm,
  asset,
  currentAmount,
  isModal = false,
}: ReceiveAmountProps) => {
  const { modalProps, overlayProps, modalContentProps } = useModalRegistration({
    isOpen: isModal,
    onClose,
  })

  const methods = useForm<ReceiveAmountInput>({
    defaultValues: {
      fiatAmount: '',
      amountCryptoPrecision: '',
    },
  })

  const content = useMemo(
    () => (
      <FormProvider {...methods}>
        <ReceiveAmountContent
          onClose={onClose}
          asset={asset}
          currentAmount={currentAmount}
          onConfirm={onConfirm}
          isModal={isModal}
        />
      </FormProvider>
    ),
    [onClose, asset, onConfirm, isModal, currentAmount, methods],
  )

  if (isModal) {
    return (
      <Modal {...modalProps} isCentered>
        <ModalOverlay {...overlayProps} />
        <ModalContent {...modalContentProps}>{content}</ModalContent>
      </Modal>
    )
  }

  return content
}
