/* eslint-disable import/no-anonymous-default-export */
/* eslint-disable import/no-default-export */

import { Container } from '@chakra-ui/react'
import { RawText } from 'components/Text'

import { Amount } from './Amount'

export default {
  title: 'Typography/Amount/Amount.Fiat',
  component: Amount.Fiat,
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
    <Amount.Fiat value='50' />
  </>
)
