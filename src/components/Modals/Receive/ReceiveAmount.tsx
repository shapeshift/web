import type { InputProps } from '@chakra-ui/react'
import {
  Box,
  Button,
  FormControl,
  IconButton,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
} from '@chakra-ui/react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { TbX } from 'react-icons/tb'
import type { NumberFormatValues } from 'react-number-format'
import NumberFormat from 'react-number-format'
import { useTranslate } from 'react-polyglot'

import { Display } from '@/components/Display'
import { DialogBody } from '@/components/Modal/components/DialogBody'
import { DialogFooter } from '@/components/Modal/components/DialogFooter'
import { DialogHeader } from '@/components/Modal/components/DialogHeader'
import { Text } from '@/components/Text'
import { useModalRegistration } from '@/context/ModalStackProvider'
import { useLocaleFormatter } from '@/hooks/useLocaleFormatter/useLocaleFormatter'
import { allowedDecimalSeparators } from '@/state/slices/preferencesSlice/preferencesSlice'

const closeIcon = <TbX />

type ReceiveAmountContentProps = {
  onClose: () => void
  symbol: string
  currentAmount?: string
  onConfirm: (amount: string | undefined) => void
  isModal?: boolean
}

const AmountInput = (props: InputProps) => {
  return (
    <Input
      size='lg'
      fontSize='65px'
      lineHeight='65px'
      fontWeight='bold'
      textAlign='center'
      border='none'
      borderRadius='lg'
      type='number'
      bg='transparent'
      variant='unstyled'
      color={props.value ? 'text.base' : 'text.subtle'}
      {...props}
    />
  )
}

const ReceiveAmountContent = ({
  onClose,
  symbol,
  currentAmount,
  onConfirm,
  isModal = false,
}: ReceiveAmountContentProps) => {
  const [amountInput, setAmountInput] = useState('')
  const translate = useTranslate()
  const {
    number: { localeParts },
  } = useLocaleFormatter()

  useEffect(() => {
    setAmountInput(currentAmount ?? '')
  }, [currentAmount])

  const handleValueChange = useCallback((values: NumberFormatValues) => {
    setAmountInput(values.value)
  }, [])

  const handleConfirm = useCallback(() => {
    onConfirm(amountInput || undefined)
    onClose()
  }, [amountInput, onConfirm, onClose])

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
        <DialogBody>
          <Box flex={1} p={6} display='flex' flexDirection='column' justifyContent='center'>
            <FormControl textAlign='center'>
              <NumberFormat
                customInput={AmountInput}
                value={amountInput}
                onValueChange={handleValueChange}
                placeholder={`0 ${symbol.toUpperCase()}`}
                data-test='receive-amount-input'
                decimalSeparator={localeParts.decimal}
                inputMode='decimal'
                thousandSeparator={localeParts.group}
                allowedDecimalSeparators={allowedDecimalSeparators}
                autoFocus
                size='lg'
                fontSize='4xl'
                fontWeight='bold'
                textAlign='center'
                variant='unstyled'
                border='none'
                suffix={` ${symbol.toUpperCase()}`}
                isNumericString
              />
              <Text
                fontSize='sm'
                color='text.subtle'
                mt={6}
                translation={'modals.receive.amountNote'}
              />
            </FormControl>
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
            isDisabled={!amountInput}
          >
            {translate('common.confirm')}
          </Button>
        </DialogFooter>
      </Display.Mobile>
      {isModal && (
        <Display.Desktop>
          <ModalHeader>
            <Text translation={'modals.receive.setAmount'} />
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <FormControl textAlign='center'>
              <NumberFormat
                customInput={Input}
                value={amountInput}
                onValueChange={handleValueChange}
                placeholder={`0 ${symbol.toUpperCase()}`}
                data-test='receive-amount-input'
                decimalSeparator={localeParts.decimal}
                thousandSeparator={localeParts.group}
                allowedDecimalSeparators={allowedDecimalSeparators}
                inputMode='decimal'
                autoFocus
                size='lg'
                fontSize='xl'
                fontWeight='semibold'
                textAlign='center'
                variant='flushed'
                suffix={` ${symbol.toUpperCase()}`}
                isNumericString
              />
              <Text
                fontSize='sm'
                color='text.subtle'
                mt={2}
                translation={'modals.receive.amountNote'}
              />
            </FormControl>
          </ModalBody>
          <ModalFooter>
            <Button variant='ghost' mr={3} onClick={onClose}>
              {translate('common.cancel')}
            </Button>
            {currentAmount && (
              <Button variant='ghost' mr={3} onClick={handleClear}>
                {translate('common.clear')}
              </Button>
            )}
            <Button colorScheme='blue' onClick={handleConfirm} isDisabled={!amountInput}>
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
  symbol: string
  currentAmount?: string
  onConfirm: (amount: string | undefined) => void
  isModal?: boolean
}

export const ReceiveAmount = ({
  onClose,
  symbol,
  currentAmount,
  onConfirm,
  isModal = false,
}: ReceiveAmountProps) => {
  const { modalStyle, overlayStyle, isHighestModal } = useModalRegistration({
    isOpen: isModal,
    modalId: 'receive-amount-modal',
  })

  const content = useMemo(
    () => (
      <ReceiveAmountContent
        onClose={onClose}
        symbol={symbol}
        currentAmount={currentAmount}
        onConfirm={onConfirm}
        isModal={isModal}
      />
    ),
    [onClose, symbol, currentAmount, onConfirm, isModal],
  )

  if (isModal) {
    return (
      <Modal
        isOpen
        onClose={onClose}
        isCentered
        trapFocus={isHighestModal}
        blockScrollOnMount={isHighestModal}
      >
        <ModalOverlay {...overlayStyle} />
        <ModalContent containerProps={modalStyle}>{content}</ModalContent>
      </Modal>
    )
  }

  return content
}
