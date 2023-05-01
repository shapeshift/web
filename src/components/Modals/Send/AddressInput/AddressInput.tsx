import { IconButton, Input, InputGroup, InputRightElement } from '@chakra-ui/react'
import { ethChainId } from '@shapeshiftoss/caip'
import type { ControllerProps } from 'react-hook-form'
import { Controller, useWatch } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router-dom'
import { QRCodeIcon } from 'components/Icons/QRCode'
import { useFeatureFlag } from 'hooks/useFeatureFlag/useFeatureFlag'
import { selectAssetById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import type { SendInput } from '../Form'
import { SendFormFields, SendRoutes } from '../SendCommon'

type AddressInputProps = {
  rules: ControllerProps['rules']
}

export const AddressInput = ({ rules }: AddressInputProps) => {
  const assetId = useWatch<SendInput, SendFormFields.AssetId>({
    name: SendFormFields.AssetId,
  })
  const history = useHistory()
  const translate = useTranslate()
  const isYatFeatureEnabled = useFeatureFlag('Yat')
  const asset = useAppSelector(state => selectAssetById(state, assetId))
  const isYatSupportedChain = asset?.chainId === ethChainId // yat only supports eth mainnet

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
              isYatFeatureEnabled && isYatSupportedChain
                ? 'modals.send.addressInput'
                : 'modals.send.tokenAddress',
            )}
            size='lg'
            value={value}
            variant='filled'
            data-test='qrCode-address-input'
            // Because the InputRightElement is hover the input, we need to let this space free
            pe={10}
          />
        )}
        name={SendFormFields.Input}
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
