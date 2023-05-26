import { Box, Button, Flex, Text, useColorModeValue } from '@chakra-ui/react'
import type { FC } from 'react'
import { useMemo } from 'react'
import type { ListChildComponentProps } from 'react-window'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'
import type { AssetData } from 'components/AssetSearch/AssetList'
import { useWallet } from 'hooks/useWallet/useWallet'
import type { Asset } from 'lib/asset-service'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { firstNonZeroDecimal } from 'lib/math'
import { middleEllipsis } from 'lib/utils'
import { isAssetSupportedByWallet } from 'state/slices/portfolioSlice/utils'
import {
  selectPortfolioCryptoPrecisionBalanceByFilter,
  selectPortfolioFiatBalanceByAssetId,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

export const AssetRow: FC<ListChildComponentProps<AssetData>> = ({
  data: { handleClick, disableUnsupported, assets, hideZeroBalanceAmounts },
  index,
  style,
}) => {
  const color = useColorModeValue('gray.500', 'whiteAlpha.500')
  const {
    state: { isConnected, isDemoWallet, wallet },
  } = useWallet()
  const asset: Asset | undefined = assets[index]
  const assetId = asset?.assetId
  const filter = useMemo(() => ({ assetId }), [assetId])
  const isSupported = wallet && isAssetSupportedByWallet(assetId, wallet)
  const cryptoHumanBalance = useAppSelector(s =>
    selectPortfolioCryptoPrecisionBalanceByFilter(s, filter),
  )
  const fiatBalance = useAppSelector(s => selectPortfolioFiatBalanceByAssetId(s, filter)) ?? '0'
  if (!asset) return null

  const hideAssetBalance = !!(hideZeroBalanceAmounts && bnOrZero(cryptoHumanBalance).isZero())

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
          <Flex alignItems='center' gap={2}>
            <Text fontWeight='normal' fontSize='sm' color={color}>
              {asset.symbol}
            </Text>
            {asset.id && (
              <Text fontWeight='normal' fontSize='sm' color={color}>
                {middleEllipsis(asset.id)}
              </Text>
            )}
          </Flex>
        </Box>
      </Flex>
      {isConnected && !isDemoWallet && !hideAssetBalance && (
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
