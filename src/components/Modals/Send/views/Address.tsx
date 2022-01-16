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
import { ChainTypes } from '@shapeshiftoss/types'
import get from 'lodash/get'
import { useState } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router-dom'
import { SlideTransition } from 'components/SlideTransition'
import { Text } from 'components/Text'
import { useChainAdapters } from 'context/ChainAdaptersProvider/ChainAdaptersProvider'
import { useModal } from 'context/ModalProvider/ModalProvider'
import { ensInstance } from 'lib/ens-instance'

import { AddressInput } from '../AddressInput/AddressInput'
import { SendFormFields, SendInput } from '../Form'
import { SendRoutes } from '../Send'

export const Address = () => {
  const [isValidatingEnsDomain, setIsValidatingEnsDomain] = useState(false)
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
        onClick={() => history.push(SendRoutes.Select)}
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
                  if (asset.chain === ChainTypes.Ethereum) {
                    const validEnsAddress = await adapter.validateEnsAddress?.(value)
                    if (validEnsAddress?.valid) {
                      // Verify that domain is resolvable
                      setIsValidatingEnsDomain(true)
                      const address = await ensInstance.name(value).getAddress()
                      if (address === '0x0000000000000000000000000000000000000000') {
                        setIsValidatingEnsDomain(false)
                        return 'common.unresolvableEnsDomain'
                      }
                      // and add its resolution to form state as a side effect
                      setIsValidatingEnsDomain(false)
                      setValue(SendFormFields.EnsDomain, value)
                      return true
                    }
                    // If a reverse lookup exists for 0x address, display ENS address instead
                    const { name: ensDomain } = await ensInstance.getName(value)
                    setValue(SendFormFields.EnsDomain, ensDomain)
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
            isLoading={isValidatingEnsDomain}
            colorScheme={addressError && !isValidatingEnsDomain ? 'red' : 'blue'}
            size='lg'
            onClick={handleNext}
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
