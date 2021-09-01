import { IconButton, Input, InputGroup, InputRightElement } from '@chakra-ui/react'
import { QRCode } from 'components/Icons/QRCode'
import { Controller, ControllerProps, useFormContext } from 'react-hook-form'
import { useHistory } from 'react-router-dom'

import { SendRoutes } from '../Send'

type AddressInputProps = {
  rules: ControllerProps['rules']
}

export const AddressInput = ({ rules }: AddressInputProps) => {
  const history = useHistory()
  const { control } = useFormContext()

  const handleQrClick = () => {
    history.push(SendRoutes.Scan)
  }

  return (
    <>
      <InputGroup size='lg'>
        <Controller
          render={({ field: { onChange, value } }) => (
            <Input
              autoFocus // eslint-disable-line jsx-a11y/no-autofocus
              fontSize='sm'
              onChange={onChange}
              placeholder='Token Address'
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
            aria-label='Scan QR Code'
            icon={<QRCode />}
            onClick={handleQrClick}
            size='sm'
            variant='ghost'
          />
        </InputRightElement>
      </InputGroup>
    </>
  )
}
