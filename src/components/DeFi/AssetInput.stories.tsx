/* eslint-disable import/no-anonymous-default-export */
/* eslint-disable import/no-default-export */

import { Container } from '@chakra-ui/react'
import type { ComponentMeta, ComponentStory } from '@storybook/react'

import { AllocationTable } from './components/AllocationTable'
import type { AssetInputProps } from './components/AssetInput'
import { AssetInput } from './components/AssetInput'

export default {
  title: 'Forms/AssetInput',
  component: AssetInput,
  decorators: [
    (Story: any) => (
      <Container maxWidth='md'>
        <Story />
      </Container>
    ),
  ],
} as ComponentMeta<typeof AssetInput>

const Template: ComponentStory<typeof AssetInput> = (args: AssetInputProps) => (
  <AssetInput {...args} />
)

export const Basic = Template.bind({})
Basic.args = {
  assetIcon: 'https://assets.coincap.io/assets/icons/256/fox.png',
  assetSymbol: 'FOX',
  balance: '1000',
  fiatAmount: '0',
}

const testData = [
  {
    symbol: 'FOX',
    value: '1000',
    icon: 'https://assets.coincap.io/assets/icons/256/fox.png',
  },
  {
    symbol: 'USDC',
    value: '1000',
    icon: 'https://assets.coincap.io/assets/icons/256/usdc.png',
  },
]
export const WithChildren = Template.bind({})
WithChildren.args = {
  ...Basic.args,
  children: <AllocationTable label='Allocation Table' items={testData} />,
  fiatAmount: '0',
}
export const ReadOnly = Template.bind({})
ReadOnly.args = {
  ...Basic.args,
  balance: undefined,
  isReadOnly: true,
}
