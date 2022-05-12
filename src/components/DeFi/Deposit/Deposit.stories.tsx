/* eslint-disable import/no-anonymous-default-export */
/* eslint-disable import/no-default-export */

import { Modal, ModalBody, ModalContent, Stack } from '@chakra-ui/react'

import { FormField } from './components/AssetField'
import { AssetInput } from './components/AssetInput'

export default {
  title: 'Layout/Deposit',
  decorators: [
    (Story: any) => (
      <Modal isOpen onClose={() => {}} size='lg'>
        <ModalContent>
          <ModalBody py={6}>
            <Story />
          </ModalBody>
        </ModalContent>
      </Modal>
    ),
  ],
}

export const DepositScreen = () => {
  return (
    <Stack>
      <FormField label='Form Label'>
        <AssetInput
          assetName='FOX'
          balance='1000'
          assetIcon='https://assets.coincap.io/assets/icons/256/fox.png'
        />
      </FormField>
    </Stack>
  )
}
