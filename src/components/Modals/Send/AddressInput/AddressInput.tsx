import type { InputProps } from '@chakra-ui/react'
import {
  IconButton,
  Input,
  InputGroup,
  InputLeftElement,
  InputRightElement,
  Text,
} from '@chakra-ui/react'
import { useCallback, useMemo } from 'react'
import type { ControllerProps, ControllerRenderProps, FieldValues } from 'react-hook-form'
import { Controller, useFormContext, useWatch } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'
import { useNavigate } from 'react-router-dom'

import { SendFormFields, SendRoutes } from '../SendCommon'

import { QRCodeIcon } from '@/components/Icons/QRCode'
import type { SendInput } from '@/components/Modals/Send/Form'

type AddressInputProps = {
  rules: ControllerProps['rules']
  enableQr?: boolean
  placeholder?: string
} & Omit<InputProps, 'as' | 'value' | 'onChange'>

const qrCodeIcon = <QRCodeIcon />

export const AddressInput = ({
  rules,
  placeholder,
  enableQr = false,
  onFocus,
  onBlur,
  onPaste,
  ...props
}: AddressInputProps) => {
  const navigate = useNavigate()
  const translate = useTranslate()
  const isValid = useFormContext<SendInput>().formState.isValid
  const isDirty = useFormContext<SendInput>().formState.isDirty
  const isValidating = useFormContext<SendInput>().formState.isValidating
  const value = useWatch<SendInput, SendFormFields.Input>({ name: SendFormFields.Input })

  const isInvalid = useMemo(() => {
    // Don't go invalid when async invalidation is running
    if (isValidating) return false
    // Don't go invalid until there's an actual input
    if (!value) return false

    return isValid === false
  }, [isValid, isValidating, value])

  const handleQrClick = useCallback(() => {
    navigate(SendRoutes.Scan)
  }, [navigate])

  const renderController = useCallback(
    ({
      field: { onChange, value },
    }: {
      field: ControllerRenderProps<FieldValues, SendFormFields.Input>
    }) => (
      <InputGroup alignItems='center'>
        <InputLeftElement pointerEvents='none' height='100%'>
          <Text color='text.subtle' w='full' pl={4} fontSize='sm'>
            {translate('trade.to')}
          </Text>
        </InputLeftElement>
        <Input
          spellCheck={false}
          placeholder={placeholder}
          value={value}
          variant='filled'
          minHeight='auto'
          borderRadius='10px'
          py={3}
          data-test='send-address-input'
          data-1p-ignore
          isInvalid={isInvalid && isDirty}
          onFocus={onFocus}
          onBlur={onBlur}
          onPaste={onPaste}
          {...props}
          onChange={onChange}
        />
      </InputGroup>
    ),
    // We want only behavior-specific props to rerender the controller, not all props
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [placeholder, isInvalid, isDirty, translate, onFocus, onBlur, onPaste],
  )

  return (
    <InputGroup size='lg'>
      <Controller
        render={renderController}
        name={SendFormFields.Input}
        rules={rules}
        defaultValue=''
      />
      {enableQr && (
        <InputRightElement>
          <IconButton
            aria-label={translate('modals.send.scanQrCode')}
            icon={qrCodeIcon}
            onClick={handleQrClick}
            size='sm'
            variant='ghost'
          />
        </InputRightElement>
      )}
    </InputGroup>
  )
}
