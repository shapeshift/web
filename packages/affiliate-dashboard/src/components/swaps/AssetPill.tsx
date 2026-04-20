import { Badge } from '@chakra-ui/react'

interface AssetPillProps {
  asset: { symbol: string }
}

export const AssetPill = ({ asset }: AssetPillProps): React.JSX.Element => (
  <Badge
    px={2}
    py={0.5}
    borderRadius='md'
    bg='pill.asset'
    color='pill.assetFg'
    fontSize='xs'
    fontWeight={500}
    textTransform='none'
    maxW='160px'
    overflow='hidden'
    textOverflow='ellipsis'
    whiteSpace='nowrap'
  >
    {asset.symbol}
  </Badge>
)
