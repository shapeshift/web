import { Flex, Grid, Text, useColorModeValue } from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import { useMemo } from 'react'
import { FaArrowDown, FaArrowUp } from 'react-icons/fa'

import { Amount } from '@/components/Amount/Amount'
import { AssetIcon } from '@/components/AssetIcon'
import { bnOrZero } from '@/lib/bignumber/bignumber'

type AssetListItemProps = {
  name: string
  symbol: string
  assetId?: AssetId
  iconUrl?: string
  price?: string | number | null
  priceChange24h?: number | null
  rank?: number
  subtitle?: string
  variant?: 'default' | 'gain' | 'loss'
}

const variantColorMap = {
  default: undefined,
  gain: 'green.500',
  loss: 'red.500',
} as const

export const AssetListItem = ({
  name,
  symbol,
  assetId,
  iconUrl,
  price,
  priceChange24h,
  rank,
  subtitle,
  variant = 'default',
}: AssetListItemProps) => {
  const changeNum = useMemo(() => bnOrZero(priceChange24h), [priceChange24h])
  const hasPrice = price !== null && price !== undefined
  const hasChange = priceChange24h !== null && priceChange24h !== undefined

  const ChangeIcon = changeNum.gte(0) ? FaArrowUp : FaArrowDown
  const variantColor = variantColorMap[variant]
  const mutedColor = useColorModeValue('gray.500', 'gray.400')

  return (
    <Grid templateColumns='1fr auto' gap={4} alignItems='center' py={2} width='full'>
      <Flex alignItems='center' gap={3} overflow='hidden' minWidth={0}>
        {rank !== undefined && (
          <Text
            fontSize='sm'
            fontWeight='medium'
            color={mutedColor}
            minWidth='32px'
            textAlign='right'
            whiteSpace='nowrap'
          >
            #{rank}
          </Text>
        )}
        {assetId ? (
          <AssetIcon assetId={assetId} name={symbol} size='xs' />
        ) : (
          <AssetIcon src={iconUrl} name={symbol} size='xs' />
        )}
        <Flex flexDirection='column' overflow='hidden'>
          <Text fontSize='sm' fontWeight='medium' lineHeight='tight' noOfLines={1}>
            {name}
          </Text>
          <Text fontSize='xs' color={mutedColor} lineHeight='tight' noOfLines={1}>
            {subtitle ?? symbol.toUpperCase()}
          </Text>
        </Flex>
      </Flex>

      <Flex
        flexDirection='column'
        alignItems='flex-end'
        minWidth={hasPrice || hasChange ? '120px' : undefined}
      >
        {hasPrice && <Amount.Fiat value={price} fontWeight='medium' fontSize='sm' />}
        {hasChange && (
          <Flex alignItems='center' gap={1} fontSize='xs' color={variantColor}>
            <ChangeIcon size='12px' />
            <Amount.Percent
              value={priceChange24h}
              autoColor={variant === 'default'}
              color={variantColor}
              prefix={changeNum.gte(0) ? '+' : ''}
            />
          </Flex>
        )}
      </Flex>
    </Grid>
  )
}
