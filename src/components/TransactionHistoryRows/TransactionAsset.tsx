import { Box, Circle, useColorModeValue } from '@chakra-ui/react'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'
import { RawText, Text } from 'components/Text'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { fromBaseUnit } from 'lib/math'

type TransactionRowUnderlyingAssets = {
  count: number
  value: string
}

export type TransactionRowAsset = {
  symbol: string
  amount: string
  precision: number
  currentPrice?: string
  icon?: string
  underlyingAssets?: TransactionRowUnderlyingAssets
}

type TransactionAssetRowProps = {
  asset: TransactionRowAsset
  index: number
  compactMode: boolean
  isFirstAssetOutgoing: boolean
}

export const TransactionAsset = ({
  asset,
  index,
  compactMode,
  isFirstAssetOutgoing,
}: TransactionAssetRowProps) => {
  const textColor = useColorModeValue('blue.500', 'blue.200')
  const bgColor = useColorModeValue('blue.50', 'rgba(127, 153, 251, 0.2)')
  if (!asset.underlyingAssets)
    return (
      <>
        <AssetIcon src={asset.icon} boxSize={{ base: '24px', md: compactMode ? '24px' : '40px' }} />
        <Box flex={1}>
          <Amount.Crypto
            color='inherit'
            fontWeight='medium'
            prefix={index === 0 && isFirstAssetOutgoing ? '-' : ''}
            value={fromBaseUnit(asset.amount ?? '0', asset.precision)}
            symbol={asset.symbol}
            maximumFractionDigits={4}
          />
          {asset.currentPrice && (
            <Amount.Fiat
              color='gray.500'
              fontSize='sm'
              lineHeight='1'
              prefix={index === 0 && isFirstAssetOutgoing ? '-' : ''}
              value={bnOrZero(fromBaseUnit(asset.amount ?? '0', asset.precision))
                .times(asset.currentPrice)
                .toString()}
            />
          )}
        </Box>
      </>
    )
  const { count, value } = asset.underlyingAssets
  return (
    <>
      <Circle
        color={textColor}
        bg={bgColor}
        fontWeight='bold'
        size={{ base: '24px', md: compactMode ? '24px' : '40px' }}
        fontSize='lg'
      >
        {count}
      </Circle>
      <Box flex={1}>
        <Box display='flex' fontWeight='bold'>
          <RawText mr={1}>{count}</RawText>
          <Text translation='transactionHistory.assets' />
        </Box>
        <Amount.Fiat
          color='gray.500'
          fontSize='sm'
          lineHeight='1'
          prefix={index === 0 && isFirstAssetOutgoing ? '-' : ''}
          value={value}
        />
      </Box>
    </>
  )
}
