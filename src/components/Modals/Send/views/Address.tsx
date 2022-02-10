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
  Stack
} from '@chakra-ui/react'
import { ChainAdapter } from '@shapeshiftoss/chain-adapters'
import { ChainTypes } from '@shapeshiftoss/types'
import get from 'lodash/get'
import { useState } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router-dom'
import { SelectAssetRoutes } from 'components/SelectAssets/SelectAssetRouter'
import { SlideTransition } from 'components/SlideTransition'
import { Text } from 'components/Text'
import { useChainAdapters } from 'context/ChainAdaptersProvider/ChainAdaptersProvider'
import { useModal } from 'context/ModalProvider/ModalProvider'
import { ensLookup, ensReverseLookup } from 'lib/ens'

import { AddressInput } from '../AddressInput/AddressInput'
import { SendFormFields, SendInput } from '../Form'
import { SendRoutes } from '../Send'

export const Address = () => {
  const [isValidatingEnsName, setisValidatingEnsName] = useState(false)
  const history = useHistory()
  const translate = useTranslate()
  const {
    setValue,
    formState: { errors }
  } = useFormContext<SendInput>()
  const address = useWatch<SendInput, SendFormFields.Address>({ name: SendFormFields.Address })
  const asset = useWatch<SendInput, SendFormFields.Asset>({ name: SendFormFields.Asset })

  const chainAdapters = useChainAdapters()
  const { send } = useModal()

  if (!(asset?.chain && asset?.name)) return null

  const adapter = chainAdapters.byChain(asset.chain)
  const isEthereumChainAdapter = (
    adapter: ChainAdapter<ChainTypes>
  ): adapter is ChainAdapter<ChainTypes.Ethereum> => adapter.getType() === ChainTypes.Ethereum

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
            assetId: asset.caip19
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
                  const validAddress = await adapter.validateAddress(value)
                  if (isEthereumChainAdapter(adapter)) {
                    const validEnsAddress = await adapter.validateEnsAddress(value)
                    if (validEnsAddress.valid) {
                      // Verify that the ENS name resolves to an address
                      setisValidatingEnsName(true)
                      const { error: isUnresolvableEnsName } = await ensLookup(value)
                      if (isUnresolvableEnsName) {
                        setisValidatingEnsName(false)
                        return 'common.unresolvableEnsDomain'
                      }
                      // and add it to form state as a side effect
                      setisValidatingEnsName(false)
                      setValue(SendFormFields.EnsName, value)
                      return true
                    }
                    // If a lookup exists for a 0x address, display ENS name instead
                    const reverseValueLookup = await ensReverseLookup(value)
                    !reverseValueLookup.error &&
                      setValue(SendFormFields.EnsName, reverseValueLookup.name)
                  }
                  return validAddress.valid || 'common.invalidAddress'
                }
              }
            }}
          />
        </FormControl>
      </ModalBody>
      <ModalFooter>
        <Stack flex={1}>
          <Button
            isFullWidth
            isDisabled={!address || addressError}
            isLoading={isValidatingEnsName}
            colorScheme={addressError && !isValidatingEnsName ? 'red' : 'blue'}
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
