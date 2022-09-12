/* eslint-disable import/no-anonymous-default-export */
/* eslint-disable import/no-default-export */

import { Container } from '@chakra-ui/react'

import { AssetInput } from './components/AssetInput'
import type { FormFieldProps } from './components/FormField'
import { FormField } from './components/FormField'

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
      assetSymbol='FOX'
      assetIcon='https://assets.coincap.io/assets/icons/256/fox.png'
      percentOptions={[0.25, 0.5, 0.75, 1]}
      fiatAmount='0'
    />
  ),
}
