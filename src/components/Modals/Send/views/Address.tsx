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
import { ChainIdentifier } from '@shapeshiftoss/chain-adapters'
import { SlideTransition } from 'components/SlideTransition'
import { Text } from 'components/Text'
import { useChainAdapters } from 'context/ChainAdaptersProvider/ChainAdaptersProvider'
import { useModal } from 'context/ModalProvider/ModalProvider'
import get from 'lodash/get'
import { useFormContext, useWatch } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router-dom'

import { AddressInput } from '../AddressInput/AddressInput'
import { SendRoutes } from '../Send'

export const Address = () => {
  const history = useHistory()
  const translate = useTranslate()
  const {
    formState: { errors }
  } = useFormContext()
  const [address, asset] = useWatch({ name: ['address', 'asset'] })
  const chainAdapters = useChainAdapters()
  const adapter = chainAdapters.byChain(ChainIdentifier.Ethereum)
  const { send } = useModal()

  const handleNext = () => history.push(SendRoutes.Details)

  const addressError = get(errors, 'address.message', null)

  return (
    <SlideTransition>
      <IconButton
        variant='ghost'
        icon={<ArrowBackIcon />}
        aria-label='Back'
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
        <FormControl isRequired>
          <FormLabel color='gray.500' w='full'>
            {translate('modals.send.sendForm.sendTo')}
          </FormLabel>
          <AddressInput
            rules={{
              required: true,
              validate: {
                validateAddress: async (value: string) => {
                  const validAddress = await adapter.validateAddress(value)
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
            isDisabled={!address}
            colorScheme={addressError ? 'red' : 'blue'}
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
