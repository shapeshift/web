import {
  Box,
  Button,
  Flex,
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
import { Text } from '@/components/Text'

const closeIcon = <TbX />

type ReceiveAmountContentProps = {
  onClose: () => void
  symbol: string
  currentAmount?: string
  onConfirm: (amount: string | undefined) => void
}

const ReceiveAmountContent = ({
  onClose,
  symbol,
  currentAmount,
  onConfirm,
}: ReceiveAmountContentProps) => {
  const [amountInput, setAmountInput] = useState('')
  const translate = useTranslate()

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
        <Flex direction='column' height='100vh' bg='background.surface.base'>
          <Flex
            justify='space-between'
            align='center'
            p={4}
            borderBottom='1px solid'
            borderColor='border.base'
          >
            <Box />
            <Text fontSize='lg' fontWeight='semibold' translation={'modals.receive.setAmount'} />
            <IconButton
              icon={closeIcon}
              aria-label='Close'
              variant='ghost'
              size='sm'
              onClick={onClose}
            />
          </Flex>
          <Box flex={1} p={6} display='flex' flexDirection='column' justifyContent='center'>
            <FormControl textAlign='center'>
              <NumberFormat
                customInput={Input}
                value={amountInput}
                onValueChange={handleValueChange}
                placeholder={`0 ${symbol.toUpperCase()}`}
                data-test='receive-amount-input'
                inputMode='decimal'
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
          <Flex p={4} gap={3} borderTop='1px solid' borderColor='border.base'>
            <Button variant='ghost' flex={1} size='lg' onClick={onClose}>
              {translate('common.cancel')}
            </Button>
            {currentAmount && (
              <Button variant='ghost' flex={1} size='lg' onClick={handleClear}>
                {translate('common.clear')}
              </Button>
            )}
            <Button colorScheme='blue' flex={1} size='lg' onClick={handleConfirm}>
              {translate('common.confirm')}
            </Button>
          </Flex>
        </Flex>
      </Display.Mobile>
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
          <Button colorScheme='blue' onClick={handleConfirm}>
            {translate('common.confirm')}
          </Button>
        </ModalFooter>
      </Display.Desktop>
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
  const content = useMemo(
    () => (
      <ReceiveAmountContent
        onClose={onClose}
        symbol={symbol}
        currentAmount={currentAmount}
        onConfirm={onConfirm}
      />
    ),
    [onClose, symbol, currentAmount, onConfirm],
  )

  if (isModal) {
    return (
      <Modal isOpen onClose={onClose} isCentered>
        <ModalOverlay />
        <ModalContent>{content}</ModalContent>
      </Modal>
    )
  }

  return content
}

export { ReceiveAmountContent }
