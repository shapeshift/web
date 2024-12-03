import { Box, Card, Center, Flex, useMediaQuery } from '@chakra-ui/react'
import type { FormEvent } from 'react'
import type { TradeInputTab } from 'components/MultiHopTrade/types'
import { ThorFreeFeeBanner } from 'components/ThorFreeFeeBanner/ThorFreeFeeBanner'
import { breakpoints } from 'theme/theme'

import { SharedTradeInputHeader } from '../SharedTradeInput/SharedTradeInputHeader'

type SharedTradeInputProps = {
  bodyContent: JSX.Element
  footerContent: JSX.Element
  headerRightContent: JSX.Element
  isCompact: boolean | undefined
  sideContent: JSX.Element
  tradeInputRef: React.RefObject<HTMLDivElement>
  tradeInputTab: TradeInputTab
  onChangeTab: (newTab: TradeInputTab) => void
  onSubmit: (e: FormEvent<unknown>) => void
}

export const SharedTradeInput: React.FC<SharedTradeInputProps> = ({
  bodyContent,
  headerRightContent,
  isCompact,
  sideContent,
  tradeInputTab,
  tradeInputRef,
  footerContent,
  onChangeTab,
  onSubmit,
}) => {
  const [isSmallerThanXl] = useMediaQuery(`(max-width: ${breakpoints.xl})`, { ssr: false })

  return (
    <Flex
      id='test-flex'
      width='full'
      justifyContent='center'
      maxWidth={isCompact || isSmallerThanXl ? '500px' : undefined}
    >
      <Center width='inherit' alignItems='flex-end'>
        <Box width='full' maxWidth='500px'>
          <ThorFreeFeeBanner />
          <Card
            flex={1}
            width='full'
            maxWidth='500px'
            ref={tradeInputRef}
            as='form'
            onSubmit={onSubmit}
          >
            <SharedTradeInputHeader
              initialTab={tradeInputTab}
              rightContent={headerRightContent}
              onChangeTab={onChangeTab}
            />
            {bodyContent}
            {footerContent}
          </Card>
        </Box>
        {sideContent}
      </Center>
    </Flex>
  )
}
