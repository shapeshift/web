import type { SpaceProps } from '@chakra-ui/react'
import { IconButton, InputGroup, InputRightElement, Textarea } from '@chakra-ui/react'
import { useCallback, useMemo } from 'react'
import type { ControllerProps, ControllerRenderProps, FieldValues } from 'react-hook-form'
import { Controller, useFormContext, useWatch } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router-dom'
import ResizeTextarea from 'react-textarea-autosize'

import { SendFormFields, SendRoutes } from '../SendCommon'

import { QRCodeIcon } from '@/components/Icons/QRCode'
import type { SendInput } from '@/components/Modals/Send/Form'

type AddressInputProps = {
  rules: ControllerProps['rules']
  enableQr?: boolean
  placeholder?: string
  pe?: SpaceProps['pe']
}

const qrCodeIcon = <QRCodeIcon />

export const AddressInput = ({
  rules,
  placeholder,
  enableQr = false,
  pe = 10,
}: AddressInputProps) => {
  const history = useHistory()
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
    history.push(SendRoutes.Scan)
  }, [history])

  const renderController = useCallback(
    ({
      field: { onChange, value },
    }: {
      field: ControllerRenderProps<FieldValues, SendFormFields.Input>
    }) => (
      <Textarea
        spellCheck={false}
        onChange={onChange}
        placeholder={placeholder}
        as={ResizeTextarea}
        value={value}
        pr={12}
        variant='filled'
        minHeight='auto'
        minRows={1}
        py={3}
        data-test='send-address-input'
        data-1p-ignore
        // Because the InputRightElement is hover the input, we need to let this space free
        pe={pe}
        isInvalid={isInvalid && isDirty}
        // This is already a `useCallback()`
        // eslint-disable-next-line react-memo/require-usememo
      />
    ),
    [placeholder, pe, isInvalid, isDirty],
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
