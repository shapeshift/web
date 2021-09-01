import { ArrowBackIcon } from '@chakra-ui/icons'
import {
  Box,
  Button,
  FormControl,
  FormHelperText,
  FormLabel,
  IconButton,
  Input,
  InputGroup,
  InputRightElement,
  ModalBody,
  ModalCloseButton,
  ModalFooter,
  ModalHeader
} from '@chakra-ui/react'
import { QRCode } from 'components/Icons/QRCode'
import { SlideTransition } from 'components/SlideTransition'
import { Text } from 'components/Text'
import { TokenRow } from 'components/TokenRow/TokenRow'
import { useModal } from 'context/ModalProvider/ModalProvider'
import { useState } from 'react'
import { Controller, useFormContext } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router-dom'

import { TxFeeRadioGroup } from './TxFeeRadioGroup'

export const Details = () => {
  const [fiatInput, setFiatInput] = useState<boolean>(true)
  const translate = useTranslate()
  const history = useHistory()
  const {
    control,
    getValues,
    formState: { isValid }
  } = useFormContext()
  const { send } = useModal()

  const toggleCurrency = () => {
    setFiatInput(input => !input)
  }

  const onNext = () => {
    history.push('/send/confirm')
  }

  return (
    <SlideTransition>
      <IconButton
        variant='ghost'
        icon={<ArrowBackIcon />}
        aria-label='Back'
        position='absolute'
        top={2}
        left={3}
        fontSize='xl'
        size='sm'
        isRound
        onClick={() => history.push('/send/select')}
      />
      <ModalHeader textAlign='center'>
        {translate('modals.send.sendForm.sendAsset', { asset: 'Bitcoin' })}
      </ModalHeader>
      <ModalCloseButton borderRadius='full' />
      <ModalBody>
        <FormControl isRequired>
          <FormLabel color='gray.500' w='full'>
            {translate('modals.send.sendForm.sendTo')}
          </FormLabel>
          <InputGroup size='lg'>
            <Controller
              render={({ field: { onChange, value } }) => (
                <Input
                  autoFocus // eslint-disable-line jsx-a11y/no-autofocus
                  onChange={onChange}
                  placeholder='Token Address'
                  size='lg'
                  value={value}
                  variant='filled'
                />
              )}
              control={control}
              name='address'
              rules={{ required: true }}
            />
            <InputRightElement>
              <IconButton aria-label='Scan QR Code' size='sm' variant='ghost' icon={<QRCode />} />
            </InputRightElement>
          </InputGroup>
        </FormControl>
        <FormControl mt={4}>
          <Box display='flex' alignItems='center' justifyContent='space-between'>
            <FormLabel color='gray.500'>{translate('modals.send.sendForm.sendAmount')}</FormLabel>
            <FormHelperText
              mt={0}
              mr={3}
              mb={2}
              as='button'
              color='gray.500'
              onClick={toggleCurrency}
              _hover={{ color: 'white' }}
            >
              ≈{' '}
              {!fiatInput
                ? `${getValues('fiat.amount') ?? 0} ${getValues('fiat.symbol')}`
                : `${getValues('crypto.amount') ?? 0} ${getValues('crypto.symbol')}`}
            </FormHelperText>
          </Box>
          <TokenRow
            control={control}
            fieldName={fiatInput ? 'fiat.amount' : 'crypto.amount'}
            inputLeftElement={
              <Button ml={1} size='sm' variant='ghost' width='full' onClick={toggleCurrency}>
                {fiatInput ? getValues('fiat.symbol') : getValues('crypto.symbol')}
              </Button>
            }
            inputRightElement={
              <Button h='1.75rem' size='sm' variant='ghost' colorScheme='blue'>
                <Text translation='modals.send.sendForm.max' />
              </Button>
            }
            rules={{ required: true }}
          />
        </FormControl>
        <FormControl mt={4}>
          <FormLabel color='gray.500' htmlFor='tx-fee'>
            {translate('modals.send.sendForm.transactionFee')}
          </FormLabel>
          <TxFeeRadioGroup />
        </FormControl>
      </ModalBody>
      <ModalFooter>
        <Button variant='ghost' size='lg' mr={3} onClick={send.close}>
          <Text translation='common.cancel' />
        </Button>
        <Button isDisabled={!isValid} colorScheme='blue' size='lg' onClick={onNext}>
          <Text translation='common.next' />
        </Button>
      </ModalFooter>
    </SlideTransition>
  )
}
