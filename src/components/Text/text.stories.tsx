/* eslint-disable import/no-anonymous-default-export */
/* eslint-disable import/no-default-export */

import { Container, Text as CText } from '@chakra-ui/react'
import { Story } from '@storybook/react'
import { TestProviders } from 'test/TestProviders'

import { Text, TextPropTypes } from './Text'

export default {
  title: 'Typography/Text',
  component: Text,
  subComponents: { Text: CText },
  argTypes: {
    fontSize: {
      options: [
        'xs',
        'sm',
        'md',
        'lg',
        'xl',
        '2xl',
        '3xl',
        '4xl',
        '5xl',
        '6xl',
        '7xl',
        '8xl',
        '9xl'
      ],
      control: { type: 'select' },
      description: 'Size of text',
      default: undefined
    },
    translation: {
      description: 'Takes a translation key'
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

const Template: Story<TextPropTypes> = args => <Text {...args} />

export const Basic = Template.bind({})
Basic.args = {
  fontSize: undefined,
  translation: 'common.cancel'
}

export const Translations = () => <Text fontSize='6xl' translation='t.prop.takes.translation.key' />

export const Sizes: Story = () => (
  <>
    <Text fontSize='xs' translation='(xs) fontSize' />
    <Text fontSize='sm' translation='(sm) fontSize' />
    <Text fontSize='md' translation='(md) fontSize: this is the default size' />
    <Text fontSize='lg' translation='(lg) fontSize' />
    <Text fontSize='xl' translation='(xl) fontSize' />
    <Text fontSize='2xl' translation='(2xl) fontSize' />
    <Text fontSize='3xl' translation='(3xl) fontSize' />
    <Text fontSize='4xl' translation='(4xl) fontSize' />
    <Text fontSize='5xl' translation='(5xl) fontSize' />
    <Text fontSize='6xl' translation='(6xl) fontSize' />
    <Text fontSize='7xl' translation='(7xl) fontSize' />
    <Text fontSize='8xl' translation='(8xl) fontSize' />
    <Text fontSize='9xl' translation='(9xl) fontSize' />
  </>
)
