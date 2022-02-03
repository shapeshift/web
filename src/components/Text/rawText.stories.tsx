/* eslint-disable import/no-anonymous-default-export */
/* eslint-disable import/no-default-export */

import { Container, Text as CText, TextProps } from '@chakra-ui/react'
import { Story } from '@storybook/react'

import { RawText } from './Text'

export default {
  title: 'Typography/RawText',
  component: RawText,
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
    children: {
      description: ''
    }
  },
  decorators: [
    (Story: any) => (
      <Container mt='40px'>
        <Story />
      </Container>
    )
  ]
}

const Template: Story<TextProps> = args => <RawText {...args} />

export const Basic = Template.bind({})
Basic.args = {
  fontSize: undefined,
  children: 'RawText Children'
}

export const Sizes: Story = () => (
  <>
    <RawText fontSize='xs'>(xs) fontSize</RawText>
    <RawText fontSize='sm'>(sm) fontSize</RawText>
    <RawText fontSize='md'>(md) fontSize this is the default size</RawText>
    <RawText fontSize='lg'>(lg) fontSize</RawText>
    <RawText fontSize='xl'>(xl) fontSize</RawText>
    <RawText fontSize='2xl'>(2xl) fontSize</RawText>
    <RawText fontSize='3xl'>(3xl) fontSize</RawText>
    <RawText fontSize='4xl'>(4xl) fontSize</RawText>
    <RawText fontSize='5xl'>(5xl) fontSize</RawText>
    <RawText fontSize='6xl'>(6xl) fontSize</RawText>
    <RawText fontSize='7xl'>(7xl) fontSize</RawText>
    <RawText fontSize='8xl'>(8xl) fontSize</RawText>
    <RawText fontSize='9xl'>(9xl) fontSize</RawText>
  </>
)
