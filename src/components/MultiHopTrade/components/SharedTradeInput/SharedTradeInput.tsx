import type { CardProps } from '@chakra-ui/react'
import { Box, Card, Center, Flex, useMediaQuery } from '@chakra-ui/react'
import type { FormEvent, JSX } from 'react'
import { useMemo } from 'react'

import { SharedTradeInputHeader } from '../SharedTradeInput/SharedTradeInputHeader'
import { useSharedWidth } from '../TradeInput/hooks/useSharedWidth'

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
  tradeInputRef: React.RefObject<HTMLDivElement | null>
  tradeInputTab: TradeInputTab
  onChangeTab: (newTab: TradeInputTab) => void
  onSubmit: (e: FormEvent<unknown>) => void
  isStandalone?: boolean
}

const cardBorderRadius = { base: '0', md: '2xl' }
const cardMinHeight = { base: 'calc(100vh - var(--mobile-nav-offset))', md: 'initial' }
const cardBgProp = { base: 'background.surface.base', md: 'background.surface.raised.accent' }

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

  const isSideComponentOpen = useMemo(() => {
    return !isCompact && !isSmallerThanXl && shouldOpenSideComponent
  }, [isCompact, isSmallerThanXl, shouldOpenSideComponent])

  // Styling to ensure we collapse the sidebar smoothly and don't chop off any box shadow
  const overflowBoxStyles = useMemo(() => {
    if (!isSideComponentOpen) return {}
    return { overflow: 'hidden', padding: 0.5 }
  }, [isSideComponentOpen])

  return (
    <Flex
      id='test-flex'
      width='full'
      justifyContent='center'
      maxWidth={isCompact || isSmallerThanXl ? '500px' : undefined}
    >
      <Center width='inherit'>
        <Box width={isSmallerThanXl || isStandalone ? '100%' : 'initial'} maxWidth='100%'>
          <Box width='full' maxWidth='1000px' display='flex' {...overflowBoxStyles}>
            <Card
              flex={1}
              width={isSmallerThanXl || isStandalone ? 'full' : '500px'}
              maxWidth='500px'
              ref={tradeInputRef}
              as='form'
              onSubmit={onSubmit}
              bg={cardBgProp}
              borderRadius={cardBorderRadius}
              minHeight={cardMinHeight}
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
