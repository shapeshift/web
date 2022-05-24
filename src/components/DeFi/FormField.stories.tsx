/* eslint-disable import/no-anonymous-default-export */
/* eslint-disable import/no-default-export */

import { Container } from '@chakra-ui/react'

import { AssetInput } from './components/AssetInput'
import { FormField, FormFieldProps } from './components/FormField'

export default {
  title: 'Forms/FormField',
  component: AssetInput,
  controls: { expanded: true },
  decorators: [
    (Story: any) => (
      <Container maxWidth='md'>
        <Story />
      </Container>
    ),
  ],
}

export const Default = (props: FormFieldProps) => <FormField {...props} />
Default.args = {
  label: 'This is a field label',
  children: (
    <AssetInput
      assetName='FOX'
      assetIcon='https://assets.coincap.io/assets/icons/256/fox.png'
      fiatAmount='0'
    />
  ),
}
