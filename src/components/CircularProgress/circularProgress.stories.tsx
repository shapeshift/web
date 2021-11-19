/* eslint-disable import/no-anonymous-default-export */
/* eslint-disable import/no-default-export */

import {
  Center,
  CircularProgress as CCircularProgress,
  CircularProgressProps,
  Container
} from '@chakra-ui/react'
import { Story } from '@storybook/react'
import { TestProviders } from 'jest/TestProviders'

import { CircularProgress } from './CircularProgress'

export default {
  title: 'Feedback/CircularProgress',
  component: CircularProgress,
  subComponents: { CircularProgress: CCircularProgress },
  argTypes: {
    isIndeterminate: {
      control: { type: 'boolean' },
      description: 'makes it spin',
      default: undefined
    }
  },
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

const Template: Story<CircularProgressProps> = args => (
  <Center>
    <CircularProgress {...args} />
  </Center>
)

export const Basic = Template.bind({})
