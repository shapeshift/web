/* eslint-disable import/no-anonymous-default-export */
/* eslint-disable import/no-default-export */

import { Box, Container, InputProps } from '@chakra-ui/react'
import { Story } from '@storybook/react'

import { FlexibleInputContainer } from './FlexibleInputContainer'

export default {
  title: 'Forms/FlexibleInputContainer',
  component: FlexibleInputContainer,
  args: {
    value: 'Text long enough to cause some scaling'
  },
  decorators: [
    (Story: any) => (
      <Container centerContent>
        <Box w={300}>
          <Story />
        </Box>
      </Container>
    )
  ]
}

const Template: Story<InputProps> = args => (
  <>
    <FlexibleInputContainer placeholder='Text' {...args} />
  </>
)

export const Basic = Template.bind({})
