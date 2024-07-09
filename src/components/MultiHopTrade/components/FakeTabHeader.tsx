import { Flex, Heading } from '@chakra-ui/react'
import { useTranslate } from 'react-polyglot'

type FakeTabHeaderProps = { onClickClaims?: () => void; onClickTrade?: () => void }

export const FakeTabHeader = ({ onClickClaims, onClickTrade }: FakeTabHeaderProps) => {
  const translate = useTranslate()

  return (
    <Flex gap={4}>
      <Heading
        as='h5'
        fontSize='md'
        color={onClickTrade ? 'text.subtle' : undefined}
        onClick={onClickTrade}
        cursor={onClickTrade ? 'pointer' : undefined}
      >
        {translate('navBar.trade')}
      </Heading>
      <Heading
        as='h5'
        fontSize='md'
        color={onClickClaims ? 'text.subtle' : undefined}
        onClick={onClickClaims}
        cursor={onClickClaims ? 'pointer' : undefined}
      >
        {translate('bridge.claims')}
      </Heading>
    </Flex>
  )
}
