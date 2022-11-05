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
  const [isValidating, setIsValidating] = useState(false)
  const history = useHistory()
  const translate = useTranslate()
  const {
    setValue,
    formState: { errors },
  } = useFormContext<SendInput>()
  const address = useWatch<SendInput, SendFormFields.Address>({ name: SendFormFields.Address })
  const input = useWatch<SendInput, SendFormFields.Input>({ name: SendFormFields.Input })
  const { send } = useModal()
  const asset = useWatch<SendInput, SendFormFields.Asset>({ name: SendFormFields.Asset })

  if (!asset) return null
  const { chainId } = asset
  // const isYatSupportedChain = chainId === ethChainId // yat only supports eth mainnet
  const handleNext = () => history.push(SendRoutes.Details)
  const addressError = get(errors, `${SendFormFields.Input}.message`, null)

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
            toRoute: SelectAssetRoutes.Search,
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
                validateAddress: async (rawInput: string) => {
                  const value = rawInput.trim() // trim leading/trailing spaces
                  // clear previous values
                  setValue(SendFormFields.Address, '')
                  setValue(SendFormFields.VanityAddress, '')
                  setIsValidating(true)
                  // this does not throw, everything inside is handled
                  const { address, vanityAddress } = await parseAddressInput({ chainId, value })
                  setIsValidating(false)
                  // set returned values
                  setValue(SendFormFields.Address, address)
                  setValue(SendFormFields.VanityAddress, vanityAddress)
                  // const invalidMessage =
                  //   isYatFeatureEnabled && isYatSupportedChain
                  //     ? 'common.invalidAddressOrYat'
                  //     : 'common.invalidAddress'
                  return address ? true : false
                },
              },
            }}
          />
        </FormControl>
        {/* {isYatFeatureEnabled && isYatSupportedChain && <YatBanner mt={6} />} */}
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
          <Button width='full' variant='ghost' size='lg' mr={3} onClick={() => send.close()}>
            <Text translation='common.cancel' />
          </Button>
        </Stack>
      </ModalFooter>
    </SlideTransition>
  )
}
