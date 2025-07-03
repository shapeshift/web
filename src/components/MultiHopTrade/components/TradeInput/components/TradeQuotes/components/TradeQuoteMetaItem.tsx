import type { FlexProps } from '@chakra-ui/react'
import { Flex, Icon, Skeleton, Tooltip } from '@chakra-ui/react'
import type { IconType } from 'react-icons'

type TradeQuoteMetaItemProps = FlexProps & {
  tooltip?: string
  icon: IconType
  error?: boolean
  isLoading: boolean
}
export const TradeQuoteMetaItem: React.FC<TradeQuoteMetaItemProps> = ({
  tooltip,
  icon,
  error,
  isLoading,
  children,
  ...rest
}) => (
  <Tooltip label={tooltip}>
    <Flex gap={1} alignItems='center' {...rest}>
      <Icon as={icon} color={error ? 'text.error' : 'text.subtle'} boxSize={18} />
      <Skeleton isLoaded={!isLoading}>{children}</Skeleton>
    </Flex>
  </Tooltip>
)
