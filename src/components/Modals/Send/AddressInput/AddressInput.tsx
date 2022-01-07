import { IconButton, Input, InputGroup, InputRightElement } from '@chakra-ui/react'
import { Controller, ControllerProps, useFormContext } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'
import { useNavigate } from 'react-router-dom'
import { QRCodeIcon } from 'components/Icons/QRCode'

import { SendFormFields, SendInput } from '../Form'
import { SendRoutes } from '../Send'

type AddressInputProps = {
  rules: ControllerProps['rules']
}

export const AddressInput = ({ rules }: AddressInputProps) => {
  const { control } = useFormContext<SendInput>()
  let navigate = useNavigate()
  const translate = useTranslate()

  const handleQrClick = () => {
    navigate(SendRoutes.Scan)
  }

  return (
    <InputGroup size='lg'>
      <Controller
        render={({ field: { onChange, value } }) => (
          <Input
            spellCheck={false}
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
