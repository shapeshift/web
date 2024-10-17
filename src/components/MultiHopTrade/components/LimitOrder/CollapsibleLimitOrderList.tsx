import type { CardProps } from '@chakra-ui/react'

import { HorizontalCollapse } from '../TradeInput/components/HorizontalCollapse'
import { LimitOrderList } from './LimitOrderList'

export type CollapsibleLimitOrderListProps = {
  isOpen: boolean
  width: string | number
  height: string | number
  isLoading: boolean
  ml: CardProps['ml']
}

export const CollapsibleLimitOrderList: React.FC<CollapsibleLimitOrderListProps> = ({
  isOpen,
  width,
  height,
  isLoading,
  ml,
}) => {
  return (
    <HorizontalCollapse isOpen={isOpen} width={width} height={height}>
      <LimitOrderList isLoading={isLoading} ml={ml} height={height} />
    </HorizontalCollapse>
  )
}
