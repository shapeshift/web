import { Badge, Box, Image } from '@chakra-ui/react'
import type { Asset } from '@shapeshiftoss/types'

type Size = 'sm' | 'md'

interface AssetPillProps {
  asset: Asset
  size?: Size
  showNetworkIcon?: boolean
}

const sizeStyles = {
  sm: {
    px: 2,
    py: 0.5,
    fontSize: 'xs',
    iconBoxSize: '14px',
    iconTop: '-5px',
    iconLeft: '-7px',
  },
  md: {
    px: 2.5,
    py: 1,
    fontSize: 'sm',
    iconBoxSize: '16px',
    iconTop: '-6px',
    iconLeft: '-8px',
  },
} as const

export const AssetPill = ({
  asset,
  size = 'md',
  showNetworkIcon = true,
}: AssetPillProps): React.JSX.Element => {
  const s = sizeStyles[size]
  return (
    <Box position='relative' display='inline-block'>
      <Badge
        px={s.px}
        py={s.py}
        borderRadius='md'
        bg='pill.asset'
        color='pill.assetFg'
        fontSize={s.fontSize}
        fontWeight={500}
        textTransform='none'
        maxW='180px'
        overflow='hidden'
        textOverflow='ellipsis'
        whiteSpace='nowrap'
      >
        {asset.symbol}
      </Badge>
      {showNetworkIcon && asset.networkIcon && (
        <Image
          src={asset.networkIcon}
          alt=''
          boxSize={s.iconBoxSize}
          borderRadius='full'
          position='absolute'
          top={s.iconTop}
          left={s.iconLeft}
          bg='bg.surface'
          border='1.5px solid'
          borderColor='bg.surface'
        />
      )}
    </Box>
  )
}
