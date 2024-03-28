import { ArrowBackIcon } from '@chakra-ui/icons'
import {
  Button,
  FormControl,
  FormLabel,
  IconButton,
  ModalBody,
  ModalCloseButton,
  ModalFooter,
  ModalHeader,
  Stack,
} from '@chakra-ui/react'
import get from 'lodash/get'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router-dom'
import { SelectAssetRoutes } from 'components/SelectAssets/SelectAssetCommon'
import { SlideTransition } from 'components/SlideTransition'
import { Text } from 'components/Text'
import { useModal } from 'hooks/useModal/useModal'
import { parseAddressInputWithChainId } from 'lib/address/address'
import { selectAssetById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { AddressInput } from '../AddressInput/AddressInput'
import type { SendInput } from '../Form'
import { SendFormFields, SendRoutes } from '../SendCommon'

const arrowBackIcon = <ArrowBackIcon />

export const Address = () => {
  const [isValidating, setIsValidating] = useState(false)
  const history = useHistory()
  const translate = useTranslate()
  const {
    setValue,
    trigger,
    formState: { errors },
  } = useFormContext<SendInput>()
  const address = useWatch<SendInput, SendFormFields.To>({ name: SendFormFields.To })
  const input = useWatch<SendInput, SendFormFields.Input>({ name: SendFormFields.Input })
  const send = useModal('send')
  const assetId = useWatch<SendInput, SendFormFields.AssetId>({ name: SendFormFields.AssetId })

  const asset = useAppSelector(state => selectAssetById(state, assetId))

  const addressError = get(errors, `${SendFormFields.Input}.message`, null)

  useEffect(() => {
    trigger(SendFormFields.Input)
  }, [trigger])

  const handleNext = useCallback(() => history.push(SendRoutes.Details), [history])

  const handleClick = useCallback(
    () =>
      history.push(SendRoutes.Select, {
        toRoute: SelectAssetRoutes.Search,
        assetId: asset?.assetId ?? '',
      }),
    [history, asset],
  )

  const addressInputRules = useMemo(
    () => ({
      required: true,
      validate: {
        validateAddress: async (rawInput: string) => {
          if (!asset) return

          const urlOrAddress = rawInput.trim() // trim leading/trailing spaces
          setIsValidating(true)
          setValue(SendFormFields.To, '')
          setValue(SendFormFields.VanityAddress, '')
          const { assetId, chainId } = asset
          // this does not throw, everything inside is handled
          const parseAddressInputWithChainIdArgs = { assetId, chainId, urlOrAddress }
          const { address, vanityAddress } = await parseAddressInputWithChainId(
            parseAddressInputWithChainIdArgs,
          )
          setIsValidating(false)
          // set returned values
          setValue(SendFormFields.To, address)
          setValue(SendFormFields.VanityAddress, vanityAddress)
          const invalidMessage = 'common.invalidAddress'
          return address ? true : invalidMessage
        },
      },
    }),
    [asset, setValue],
  )

  const handleCancel = useCallback(() => send.close(), [send])

  if (!asset) return null

  return (
    <SlideTransition>
      <IconButton
        variant='ghost'
        icon={arrowBackIcon}
        aria-label={translate('common.back')}
        position='absolute'
        top={2}
        left={3}
        fontSize='xl'
        size='sm'
        isRound
        onClick={handleClick}
      />
      <ModalHeader textAlign='center'>
        {translate('modals.send.sendForm.sendAsset', { asset: asset.name })}
      </ModalHeader>
      <ModalCloseButton borderRadius='full' />
      <ModalBody>
        <FormControl>
          <FormLabel color='text.subtle' w='full'>
            {translate('modals.send.sendForm.sendTo')}
          </FormLabel>
          <AddressInput
            rules={addressInputRules}
            enableQr={true}
            placeholder={translate('modals.send.addressInput')}
          />
        </FormControl>
      </ModalBody>
      <ModalFooter>
        <Stack flex={1}>
          <Button
            width='full'
            isDisabled={!address || !input || addressError}
            isLoading={isValidating}
            colorScheme={addressError && !isValidating ? 'red' : 'blue'}
            size='lg'
            onClick={handleNext}
            data-test='send-address-next-button'
          >
            <Text translation={addressError || 'common.next'} />
          </Button>
          <Button width='full' variant='ghost' size='lg' mr={3} onClick={handleCancel}>
            <Text translation='common.cancel' />
          </Button>
        </Stack>
      </ModalFooter>
    </SlideTransition>
  )
}
