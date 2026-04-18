import { Badge } from '@chakra-ui/react'

interface AssetPillProps {
  asset: string | { symbol?: string; name?: string }
}

export const AssetPill = ({ asset }: AssetPillProps): React.JSX.Element => {
  const symbol = typeof asset === 'object' ? asset.symbol ?? 'Unknown' : asset
  return (
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
      {symbol}
    </Badge>
  )
}
