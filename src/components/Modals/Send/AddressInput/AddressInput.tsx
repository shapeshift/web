import { IconButton, Input, InputGroup, InputRightElement } from '@chakra-ui/react'
import { Controller, ControllerProps, useFormContext } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router-dom'
import { QRCode } from 'components/Icons/QRCode'

import { SendRoutes } from '../Send'

type AddressInputProps = {
  rules: ControllerProps['rules']
}

export const AddressInput = ({ rules }: AddressInputProps) => {
  const { control } = useFormContext()
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
            autoFocus // eslint-disable-line jsx-a11y/no-autofocus
            fontSize='sm'
            onChange={onChange}
            placeholder={translate('modals.send.tokenAddress')}
            size='lg'
            value={value}
            variant='filled'
          />
        )}
        control={control}
        name='address'
        rules={rules}
      />
      <InputRightElement>
        <IconButton
          aria-label={translate('modals.send.scanQrCode')}
          icon={<QRCode />}
          onClick={handleQrClick}
          size='sm'
          variant='ghost'
        />
      </InputRightElement>
    </InputGroup>
  )
}
