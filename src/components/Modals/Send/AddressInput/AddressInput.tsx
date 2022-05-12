import { IconButton, Input, InputGroup, InputRightElement } from '@chakra-ui/react'
import { Controller, ControllerProps, useFormContext } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router-dom'
import { QRCodeIcon } from 'components/Icons/QRCode'

import type { SendInput } from '../Form'
import { SendFormFields, SendRoutes } from '../SendCommon'

type AddressInputProps = {
  rules: ControllerProps['rules']
}

export const AddressInput = ({ rules }: AddressInputProps) => {
  const { control } = useFormContext<SendInput>()
  const history = useHistory()
  const translate = useTranslate()

  const handleQrClick = () => {
    history.push(SendRoutes.Scan)
  }

  return (
    <InputGroup size='lg'>
      <Controller
        render={({ field: { onChange, value } }) => (
          <Input
            spellCheck={false}
            autoFocus
            fontSize='sm'
            onChange={e => onChange(e.target.value.trim())}
            placeholder={translate('modals.send.tokenAddress')}
            size='lg'
            value={value}
            variant='filled'
            data-test='send-address-input'
          />
        )}
        control={control}
        name={SendFormFields.Address}
        rules={rules}
      />
      <InputRightElement>
        <IconButton
          aria-label={translate('modals.send.scanQrCode')}
          icon={<QRCodeIcon />}
          onClick={handleQrClick}
          size='sm'
          variant='ghost'
        />
      </InputRightElement>
    </InputGroup>
  )
}
