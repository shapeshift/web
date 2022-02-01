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
import get from 'lodash/get'
import { useFormContext, useWatch } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router-dom'
import { SelectAssetRoutes } from 'components/SelectAssets/SelectAssetRouter'
import { SlideTransition } from 'components/SlideTransition'
import { Text } from 'components/Text'
import { useChainAdapters } from 'context/ChainAdaptersProvider/ChainAdaptersProvider'
import { useModal } from 'context/ModalProvider/ModalProvider'

import { AddressInput } from '../AddressInput/AddressInput'
import { SendFormFields, SendInput } from '../Form'
import { SendRoutes } from '../Send'

export const Address = () => {
  const history = useHistory()
  const translate = useTranslate()
  const {
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
