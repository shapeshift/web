import { IconButton, Input, InputGroup, InputRightElement } from '@chakra-ui/react'
import { ThemingProps } from '@chakra-ui/system/dist/declarations/src/system.types'
import { Controller, ControllerProps, useFormContext } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router-dom'
import { QRCodeIcon } from 'components/Icons/QRCode'

import { SendFormFields, SendInput } from '../Form'
import { SendRoutes } from '../Send'

type AddressInputProps = {
  rules: ControllerProps['rules']
  inputFontSize?: ThemingProps['size']
}

export const AddressInput = ({ rules, inputFontSize }: AddressInputProps) => {
  const { control } = useFormContext<SendInput>()
  const history = useHistory()
  const translate = useTranslate()
  const reducePadding = inputFontSize ? new Set(['md', 'lg']).has(inputFontSize) : false

  const handleQrClick = () => {
    history.push(SendRoutes.Scan)
  }

  return (
    <InputGroup size='lg'>
      <Controller
        render={({ field: { onChange, value } }) => (
          <Input
            spellCheck={false}
            autoFocus // eslint-disable-line jsx-a11y/no-autofocus
            fontSize={inputFontSize || 'sm'}
            px={reducePadding ? '2' : undefined} // If fontSize >= 'md' we reduce default inline-padding start and end
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
