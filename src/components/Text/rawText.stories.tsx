/* eslint-disable import/no-anonymous-default-export */
/* eslint-disable import/no-default-export */

import { Container, Text as CText, TextProps } from '@chakra-ui/react'
import { Story } from '@storybook/react'

import { RawText } from './Text'

export default {
  title: 'Typography/RawText',
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

export const Default = Template.bind({})
Default.args = {
  fontSize: undefined,
  children: 'RawText Children'
}

export const Sizes: Story = () => (
  <>
    <RawText fontSize='xs'>(xs) FontSize</RawText>
    <RawText fontSize='sm'>(sm) FontSize</RawText>
    <RawText fontSize='md'>(md) FontSize this is the default size</RawText>
    <RawText fontSize='lg'>(lg) FontSize</RawText>
    <RawText fontSize='xl'>(xl) FontSize</RawText>
    <RawText fontSize='2xl'>(2xl) FontSize</RawText>
    <RawText fontSize='3xl'>(3xl) FontSize</RawText>
    <RawText fontSize='4xl'>(4xl) FontSize</RawText>
    <RawText fontSize='5xl'>(5xl) FontSize</RawText>
    <RawText fontSize='6xl'>(6xl) FontSize</RawText>
    <RawText fontSize='7xl'>(7xl) FontSize</RawText>
    <RawText fontSize='8xl'>(8xl) FontSize</RawText>
    <RawText fontSize='9xl'>(9xl) FontSize</RawText>
  </>
)
