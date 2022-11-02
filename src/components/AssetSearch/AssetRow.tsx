import { Box, Button, Flex, Text, useColorModeValue } from '@chakra-ui/react'
import type { Asset } from '@shapeshiftoss/asset-service'
import { bnOrZero } from '@shapeshiftoss/investor-foxy'
import { useMemo } from 'react'
import type { ListChildComponentProps } from 'react-window'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'
import { useWallet } from 'hooks/useWallet/useWallet'
import { firstNonZeroDecimal } from 'lib/math'
import { isAssetSupportedByWallet } from 'state/slices/portfolioSlice/utils'
import {
  selectPortfolioCryptoHumanBalanceByAssetId,
  selectPortfolioFiatBalanceByAssetId,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

export const AssetRow: React.FC<ListChildComponentProps> = ({ data, index, style }) => {
  const color = useColorModeValue('gray.500', 'whiteAlpha.500')
  const {
    state: { isConnected, isDemoWallet, wallet },
  } = useWallet()
  const asset: Asset = data.items[index]
  const assetId = asset.assetId
  const filter = useMemo(() => ({ assetId }), [assetId])
  const isSupported = wallet && isAssetSupportedByWallet(assetId, wallet)
  const cryptoHumanBalance = useAppSelector(s =>
    selectPortfolioCryptoHumanBalanceByAssetId(s, filter),
  )
  const fiatBalance = useAppSelector(s => selectPortfolioFiatBalanceByAssetId(s, filter))

  if (!asset) return null

  const { handleClick, disableUnsupported } = data

  return (
    <Button
      variant='ghost'
      onClick={() => handleClick(asset)}
      justifyContent='space-between'
      isDisabled={!isSupported && disableUnsupported}
      style={style}
      _focus={{
        shadow: 'outline-inset',
      }}
    >
      <Flex gap={4} alignItems='center'>
        <AssetIcon assetId={asset.assetId} size='sm' />
        <Box textAlign='left'>
          <Text
            lineHeight={1}
            textOverflow='ellipsis'
            whiteSpace='nowrap'
            maxWidth='200px'
            overflow='hidden'
          >
            {asset.name}
          </Text>
          <Text fontWeight='normal' fontSize='sm' color={color}>
            {asset.symbol}
          </Text>
        </Box>
      </Flex>
      {isConnected && !isDemoWallet && (
        <Flex flexDir='column' justifyContent='flex-end' alignItems='flex-end'>
          <Amount.Fiat color='var(--chakra-colors-chakra-body-text)' value={fiatBalance} />
          <Amount.Crypto
            fontSize='sm'
            fontWeight='normal'
            value={firstNonZeroDecimal(bnOrZero(cryptoHumanBalance)) ?? '0'}
            symbol={asset.symbol}
          />
        </Flex>
      )}
    </Button>
  )
}
