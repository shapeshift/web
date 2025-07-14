import type { CardProps } from '@chakra-ui/react'
import { useColorModeValue } from '@chakra-ui/react'
import { useMemo } from 'react'

import { HorizontalCollapse } from '../../TradeInput/components/HorizontalCollapse'
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
  const borderColor = useColorModeValue('border.base', 'transparent') // Patch styling: border to remedy box shadow cut off in light mode

  const cardProps: CardProps = useMemo(
    () => ({
      ml,
      height,
      borderWidth: '1px',
      borderColor,
    }),
    [ml, height, borderColor],
  )

  return (
    <HorizontalCollapse isOpen={isOpen} width={width} height={height}>
      <LimitOrderList isLoading={isLoading} cardProps={cardProps} />
    </HorizontalCollapse>
  )
}
