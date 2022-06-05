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
import { bitcoin, cosmossdk, ethereum } from '@shapeshiftoss/chain-adapters'
import get from 'lodash/get'
import { useState } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router-dom'
import { SelectAssetRoutes } from 'components/SelectAssets/SelectAssetCommon'
import { SlideTransition } from 'components/SlideTransition'
import { Text } from 'components/Text'
import { useChainAdapters } from 'context/PluginProvider/PluginProvider'
import { useModal } from 'hooks/useModal/useModal'
import { resolveVanityDomain, validateVanityDomain } from 'lib/address/address'
import { ensReverseLookup } from 'lib/address/ens'

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
  const asset = useWatch<SendInput, SendFormFields.Asset>({ name: SendFormFields.Asset })

  const chainAdapters = useChainAdapters()
  const { send } = useModal()

  if (!(asset?.chain && asset?.name)) return null

  const { chainId } = asset
  const adapter = chainAdapters.byChainId(chainId)

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
                  if (adapter instanceof cosmossdk.cosmos.ChainAdapter) {
                    setIsValidatingInput(true)
                    const validAddress = await adapter.validateAddress(value)
                    setIsValidatingInput(false)
                    return validAddress.valid || 'common.invalidAddress'
                  }
                  const validAddress = await adapter.validateAddress(value)
                  if (adapter instanceof ethereum.ChainAdapter) {
                    setIsValidatingInput(true)
                    const validVanityDomain = await validateVanityDomain({ chainId, value })
                    const { error: isUnresolvableVanityDomain, address } =
                      await resolveVanityDomain({ chainId, value })
                    setIsValidatingInput(false)
                    console.info('validVanityDomain', validVanityDomain)
                    console.info('address', address)
                    if (isUnresolvableVanityDomain || !address) {
                      setValue(SendFormFields.VanityDomain, value)
                      return 'common.unresolvableVanityDomain'
                    } else {
                      setValue(SendFormFields.Address, address)
                    }
                    if (!validVanityDomain && !validAddress.valid) return 'common.invalidAddress'

                    // If a lookup exists for a 0x address, display ENS name instead
                    const reverseValueLookup = await ensReverseLookup(value)
                    !reverseValueLookup.error &&
                      setValue(SendFormFields.VanityDomain, reverseValueLookup.name)
                    return true
                  }
                  if (adapter instanceof bitcoin.ChainAdapter) {
                    setIsValidatingInput(true)
                    const validVanityDomain = await validateVanityDomain({ chainId, value })
                    const { error: isUnresolvableVanityDomain, address } =
                      await resolveVanityDomain({ chainId, value })
                    setIsValidatingInput(false)
                    console.info('validVanityDomain', validVanityDomain)
                    console.info('address', address)
                    if (isUnresolvableVanityDomain) return 'common.unresolvableVanityDomain'
                    if (!validVanityDomain && !validAddress.valid) return 'common.invalidAddress'
                    setValue(SendFormFields.VanityDomain, value)
                    return true
                  }
                  return validAddress.valid || 'common.invalidAddress'
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
