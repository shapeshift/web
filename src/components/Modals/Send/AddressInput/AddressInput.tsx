import { IconButton, Input, InputGroup, InputRightElement } from '@chakra-ui/react'
import type { ControllerProps } from 'react-hook-form'
import { Controller } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router-dom'
import { QRCodeIcon } from 'components/Icons/QRCode'

import { SendFormFields, SendRoutes } from '../SendCommon'

type AddressInputProps = {
  rules: ControllerProps['rules']
  isYatSupported: boolean
}

export const AddressInput = ({ rules, isYatSupported }: AddressInputProps) => {
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
            onChange={onChange}
            placeholder={translate(
              isYatSupported ? 'modals.send.addressInput' : 'modals.send.tokenAddress',
            )}
            size='lg'
            value={value}
            variant='filled'
            data-test='send-address-input'
            // Because the InputRightElement is hover the input, we need to let this space free
            pe={10}
          />
        )}
        name={SendFormFields.Input}
        rules={rules}
        defaultValue=''
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
