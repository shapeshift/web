/* eslint-disable import/no-anonymous-default-export */
/* eslint-disable import/no-default-export */

import { Container, Text as CText } from '@chakra-ui/react'
import { Story } from '@storybook/react'
import { TestProviders } from 'jest/TestProviders'

import { Text, TextPropTypes } from './Text'

export default {
  title: 'Typography/Text',
  component: CText,
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

export const Default = Template.bind({})
Default.args = {
  fontSize: undefined,
  translation: 'common.cancel'
}

export const Translations = () => <Text fontSize='6xl' translation='t.prop.takes.translation.key' />

export const Sizes: Story = () => (
  <>
    <Text fontSize='xs' translation='(xs) FontSize' />
    <Text fontSize='sm' translation='(sm) FontSize' />
    <Text fontSize='md' translation='(md) FontSize: this is the default size' />
    <Text fontSize='lg' translation='(lg) FontSize' />
    <Text fontSize='xl' translation='(xl) FontSize' />
    <Text fontSize='2xl' translation='(2xl) FontSize' />
    <Text fontSize='3xl' translation='(3xl) FontSize' />
    <Text fontSize='4xl' translation='(4xl) FontSize' />
    <Text fontSize='5xl' translation='(5xl) FontSize' />
    <Text fontSize='6xl' translation='(6xl) FontSize' />
    <Text fontSize='7xl' translation='(7xl) FontSize' />
    <Text fontSize='8xl' translation='(8xl) FontSize' />
    <Text fontSize='9xl' translation='(9xl) FontSize' />
  </>
)
