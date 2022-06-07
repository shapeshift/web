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
import { useState } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router-dom'
import { SelectAssetRoutes } from 'components/SelectAssets/SelectAssetCommon'
import { SlideTransition } from 'components/SlideTransition'
import { Text } from 'components/Text'
import { useModal } from 'hooks/useModal/useModal'
import { parseAddressInput } from 'lib/address/address'

import { AddressInput } from '../AddressInput/AddressInput'
import type { SendInput } from '../Form'
import { SendFormFields, SendRoutes } from '../SendCommon'

export const Address = () => {
  const [isValidatingInput, setIsValidatingInput] = useState(false)
  const history = useHistory()
  const translate = useTranslate()
  const {
    setValue,
    formState: { errors },
  } = useFormContext<SendInput>()
  const address = useWatch<SendInput, SendFormFields.Address>({ name: SendFormFields.Address })
  const { send } = useModal()
  const asset = useWatch<SendInput, SendFormFields.Asset>({ name: SendFormFields.Asset })
  if (!asset) return null
  const { chainId } = asset
  const handleNext = () => history.push(SendRoutes.Details)
  const addressError = get(errors, `${SendFormFields.Address}.message`, null)

  return (
    <SlideTransition>
      <IconButton
        variant='ghost'
        icon={<ArrowBackIcon />}
        aria-label={translate('common.back')}
        position='absolute'
        top={2}
        left={3}
        fontSize='xl'
        size='sm'
        isRound
        onClick={() =>
          history.push(SendRoutes.Select, {
            toRoute: SelectAssetRoutes.Account,
            assetId: asset.assetId,
          })
        }
      />
      <ModalHeader textAlign='center'>
        {translate('modals.send.sendForm.sendAsset', { asset: asset.name })}
      </ModalHeader>
      <ModalCloseButton borderRadius='full' />
      <ModalBody>
        <FormControl>
          <FormLabel color='gray.500' w='full'>
            {translate('modals.send.sendForm.sendTo')}
          </FormLabel>
          <AddressInput
            rules={{
              required: true,
              validate: {
                validateAddress: async (value: string) => {
                  setIsValidatingInput(true)
                  // this does not throw, everything inside is handled
                  const { address, vanityAddress } = await parseAddressInput({ chainId, value })
                  // console.info('value', value)
                  // console.info('address', address)
                  // console.info('vanityAddress', vanityAddress)
                  setIsValidatingInput(false)
                  address && setValue(SendFormFields.Address, address)
                  vanityAddress && setValue(SendFormFields.VanityDomain, vanityAddress)
                  return address || vanityAddress ? true : 'common.invalidAddress'
                },
              },
            }}
          />
        </FormControl>
      </ModalBody>
      <ModalFooter>
        <Stack flex={1}>
          <Button
            isFullWidth
            isDisabled={!address || addressError}
            isLoading={isValidatingInput}
            colorScheme={addressError && !isValidatingInput ? 'red' : 'blue'}
            size='lg'
            onClick={handleNext}
            data-test='send-address-next-button'
          >
            <Text translation={addressError || 'common.next'} />
          </Button>
          <Button isFullWidth variant='ghost' size='lg' mr={3} onClick={() => send.close()}>
            <Text translation='common.cancel' />
          </Button>
        </Stack>
      </ModalFooter>
    </SlideTransition>
  )
}
