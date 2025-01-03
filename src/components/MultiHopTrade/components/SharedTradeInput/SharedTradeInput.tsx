import type { CardProps } from '@chakra-ui/react'
import { Box, Card, Center, Flex, useMediaQuery } from '@chakra-ui/react'
import type { FormEvent } from 'react'
import { useMemo } from 'react'
import type { TradeInputTab } from 'components/MultiHopTrade/types'
import { ThorFreeFeeBanner } from 'components/ThorFreeFeeBanner/ThorFreeFeeBanner'
import { THORSWAP_MAXIMUM_YEAR_TRESHOLD } from 'lib/fees/model'
import { breakpoints } from 'theme/theme'

import { SharedTradeInputHeader } from '../SharedTradeInput/SharedTradeInputHeader'
import { useSharedHeight } from '../TradeInput/hooks/useSharedHeight'

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
}) => {
  const [isSmallerThanXl] = useMediaQuery(`(max-width: ${breakpoints.xl})`, { ssr: false })
  const totalHeight = useSharedHeight(tradeInputRef)

  const shouldDisplayThorFreeFeeBanner = useMemo(
    () => new Date().getUTCFullYear() < THORSWAP_MAXIMUM_YEAR_TRESHOLD,
    [],
  )

  return (
    <Flex
      id='test-flex'
      width='full'
      justifyContent='center'
      maxWidth={isCompact || isSmallerThanXl ? '500px' : undefined}
    >
      <Center width='inherit' alignItems='flex-end'>
        <Box width='full' maxWidth='500px'>
          {shouldDisplayThorFreeFeeBanner ? <ThorFreeFeeBanner /> : null}
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
        <SideComponent
          isOpen={!isCompact && !isSmallerThanXl && shouldOpenSideComponent}
          isLoading={isLoading}
          width={tradeInputRef.current?.offsetWidth ?? 'full'}
          height={totalHeight ?? 'full'}
          ml={4}
        />
      </Center>
    </Flex>
  )
}
