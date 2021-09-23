/* eslint-disable import/no-anonymous-default-export */
/* eslint-disable import/no-default-export */

import { Center, Container, Tooltip } from '@chakra-ui/react'
import { Story } from '@storybook/react'
import { TestProviders } from 'jest/TestProviders'

import { HelperTooltip, HelperTooltipProps } from './HelperTooltip'

export default {
  title: 'Overlay/HelperTooltip',
  component: HelperTooltip,
  subComponents: { Tooltip },
  decorators: [
    (Story: any) => (
      <TestProviders>
        <Container mt='40px'>
          <Story />
        </Container>
      </TestProviders>
    )
  ]
}

const Template: Story<HelperTooltipProps> = args => (
  <Center>
    <HelperTooltip {...args} />
  </Center>
)

export const Basic = Template.bind({})
Basic.args = {
  children: 'hover to see effect',
  label: 'Label prop'
}
