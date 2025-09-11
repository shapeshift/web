import type { CardProps } from '@chakra-ui/react'
import { Box, Card, Center, Flex, useMediaQuery } from '@chakra-ui/react'
import type { FormEvent, JSX } from 'react'

import { cardstyles } from '../../const'
import { SharedTradeInputHeader } from '../SharedTradeInput/SharedTradeInputHeader'
import { useSharedWidth } from '../TradeInput/hooks/useSharedWidth'

import type { TradeInputTab } from '@/components/MultiHopTrade/types'
import { selectHasUserEnteredAmount } from '@/state/slices/tradeInputSlice/selectors'
import { useAppSelector } from '@/state/store'
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
  footerContent: JSX.Element | null
  headerRightContent: JSX.Element
  isCompact: boolean | undefined
  isLoading: boolean
  SideComponent: React.ComponentType<SideComponentProps>
  shouldOpenSideComponent: boolean
  tradeInputRef: React.RefObject<HTMLDivElement | null>
  tradeInputTab: TradeInputTab
  onChangeTab: (newTab: TradeInputTab) => void
  onSubmit: (e: FormEvent<unknown>) => void
  isStandalone?: boolean
}

const cardBorderRadius = { base: '0', md: '2xl' }
const cardMinHeight = {
  base: 'calc(100vh - var(--mobile-nav-offset) - env(safe-area-inset-top) - var(--safe-area-inset-top))',
  md: 'initial',
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
  const [isSmallerThanMd] = useMediaQuery(`(max-width: ${breakpoints.md})`, { ssr: false })
  const [isSmallerThanXl] = useMediaQuery(`(max-width: ${breakpoints.xl})`, { ssr: false })
  const inputWidth = useSharedWidth(tradeInputRef)
  const hasUserEnteredAmount = useAppSelector(selectHasUserEnteredAmount)

  return (
    <Flex
      id='test-flex'
      width='full'
      justifyContent='center'
      maxWidth={isCompact || isSmallerThanXl ? '500px' : undefined}
    >
      <Center width='inherit'>
        <Box width={isSmallerThanXl || isStandalone ? '100%' : 'initial'} maxWidth='100%'>
          <Box width='full' maxWidth='1000px' display='flex'>
            <Card
              flex={1}
              width={isSmallerThanXl || isStandalone ? 'full' : '500px'}
              maxWidth='500px'
              ref={tradeInputRef}
              as='form'
              onSubmit={onSubmit}
              borderRadius={cardBorderRadius}
              minHeight={cardMinHeight}
              height={!hasUserEnteredAmount && isSmallerThanMd ? cardMinHeight.base : 'initial'}
              {...cardstyles}
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
