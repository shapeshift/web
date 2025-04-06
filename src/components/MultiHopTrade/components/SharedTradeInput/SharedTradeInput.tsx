import type { CardProps } from '@chakra-ui/react'
import { Box, Card, Center, Flex, useMediaQuery } from '@chakra-ui/react'
import type { FormEvent } from 'react'

import { SharedTradeInputHeader } from '../SharedTradeInput/SharedTradeInputHeader'
import { useSharedWidth } from '../TradeInput/hooks/useSharedWidth'

import { FoxWifHatBanner } from '@/components/FoxWifHatBanner'
import type { TradeInputTab } from '@/components/MultiHopTrade/types'
import { breakpoints } from '@/theme/theme'

export type SideComponentProps = {
  isOpen: boolean
  width: string | number
  height: string | number
  isLoading: boolean
  ml: CardProps['ml']
}

type SharedTradeInputProps = {
  bodyContent: JSX.Element
  footerContent: JSX.Element
  headerRightContent: JSX.Element
  isCompact: boolean | undefined
  isLoading: boolean
  SideComponent: React.ComponentType<SideComponentProps>
  shouldOpenSideComponent: boolean
  tradeInputRef: React.RefObject<HTMLDivElement>
  tradeInputTab: TradeInputTab
  onChangeTab: (newTab: TradeInputTab) => void
  onSubmit: (e: FormEvent<unknown>) => void
  isStandalone?: boolean
}

export const SharedTradeInput: React.FC<SharedTradeInputProps> = ({
  bodyContent,
  headerRightContent,
  isCompact,
  isLoading,
  SideComponent,
  shouldOpenSideComponent,
  tradeInputTab,
  tradeInputRef,
  footerContent,
  onChangeTab,
  onSubmit,
  isStandalone,
}) => {
  const [isSmallerThanXl] = useMediaQuery(`(max-width: ${breakpoints.xl})`, { ssr: false })
  const inputWidth = useSharedWidth(tradeInputRef)

  return (
    <Flex
      id='test-flex'
      width='full'
      justifyContent='center'
      maxWidth={isCompact || isSmallerThanXl ? '500px' : undefined}
    >
      <Center width='inherit'>
        <Box width={isSmallerThanXl || isStandalone ? '100%' : 'initial'} maxWidth='100%'>
          <FoxWifHatBanner maxWidth={inputWidth ?? 500} />
          <Box width='full' maxWidth='1000px' display='flex'>
            <Card
              flex={1}
              width={isSmallerThanXl || isStandalone ? 'full' : '500px'}
              maxWidth='500px'
              ref={tradeInputRef}
              as='form'
              onSubmit={onSubmit}
            >
              <SharedTradeInputHeader
                initialTab={tradeInputTab}
                rightContent={headerRightContent}
                onChangeTab={onChangeTab}
                isStandalone={isStandalone}
              />
              {bodyContent}
              {footerContent}
            </Card>
            <SideComponent
              isOpen={!isCompact && !isSmallerThanXl && shouldOpenSideComponent}
              isLoading={isLoading}
              width={inputWidth ?? 'full'}
              height={'full'}
              ml={4}
            />
          </Box>
        </Box>
      </Center>
    </Flex>
  )
}
