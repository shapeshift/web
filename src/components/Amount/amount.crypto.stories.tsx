/* eslint-disable import/no-anonymous-default-export */
/* eslint-disable import/no-default-export */

import { Container } from '@chakra-ui/react'
import { RawText } from 'components/Text'

import { Amount } from './Amount'

export default {
  title: 'Typography/Amount/Amount.Crypto',
  component: Amount.Crypto,
  subComponents: { RawText },
  decorators: [
    (Story: any) => (
      <Container mt='40px'>
        <Story />
      </Container>
    )
  ]
}

export const Basic = () => (
  <>
    <Amount.Crypto value='0.5' symbol='BTC' />
  </>
)
