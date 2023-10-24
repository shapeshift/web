import { IconButton, Input, InputGroup, InputRightElement } from '@chakra-ui/react'
import { useCallback } from 'react'
import type { ControllerProps, ControllerRenderProps, FieldValues } from 'react-hook-form'
import { Controller, useFormContext } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router-dom'
import { QRCodeIcon } from 'components/Icons/QRCode'
import type { SendInput } from 'components/Modals/Send/Form'

import { SendFormFields, SendRoutes } from '../SendCommon'

type AddressInputProps = {
  rules: ControllerProps['rules']
  enableQr?: boolean
  placeholder?: string
}

const qrCodeIcon = <QRCodeIcon />

export const AddressInput = ({ rules, placeholder, enableQr = false }: AddressInputProps) => {
  const history = useHistory()
  const translate = useTranslate()
  const isValid = useFormContext<SendInput>().formState.isValid

  const handleQrClick = useCallback(() => {
    history.push(SendRoutes.Scan)
  }, [history])

  const renderController = useCallback(
    ({
      field: { onChange, value },
    }: {
      field: ControllerRenderProps<FieldValues, SendFormFields.Input>
    }) => (
      <Input
        spellCheck={false}
        autoFocus
        fontSize='sm'
        onChange={onChange}
        placeholder={placeholder}
        size='lg'
        value={value}
        variant='filled'
        data-test='send-address-input'
        // Because the InputRightElement is hover the input, we need to let this space free
        pe={10}
        isInvalid={!isValid}
      />
    ),
    [isValid, placeholder],
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
