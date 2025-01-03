import { Box, Button, Flex, Text, useColorModeValue } from '@chakra-ui/react'
import type { Asset } from '@shapeshiftoss/types'
import type { FC } from 'react'
import { memo, useCallback, useMemo } from 'react'
import type { ListChildComponentProps } from 'react-window'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'
import { useWallet } from 'hooks/useWallet/useWallet'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { firstNonZeroDecimal } from 'lib/math'
import { middleEllipsis } from 'lib/utils'
import { isAssetSupportedByWallet } from 'state/slices/portfolioSlice/utils'
import {
  selectPortfolioCryptoPrecisionBalanceByFilter,
  selectPortfolioUserCurrencyBalanceByAssetId,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import type { AssetData } from './AssetList'

const focus = {
  shadow: 'outline-inset',
}

const assetIconPairProps = {
  showFirst: true,
}

export const AssetRow: FC<ListChildComponentProps<AssetData>> = memo(
  ({ data: { handleClick, disableUnsupported, assets, hideZeroBalanceAmounts }, index, style }) => {
    const color = useColorModeValue('text.subtle', 'whiteAlpha.500')
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
    const userCurrencyBalance =
      useAppSelector(s => selectPortfolioUserCurrencyBalanceByAssetId(s, filter)) ?? '0'
    const handleOnClick = useCallback(() => handleClick(asset), [asset, handleClick])

    if (!asset) return null

    const hideAssetBalance = !!(hideZeroBalanceAmounts && bnOrZero(cryptoHumanBalance).isZero())

    return (
      <Button
        variant='ghost'
        onClick={handleOnClick}
        justifyContent='space-between'
        isDisabled={!isSupported && disableUnsupported}
        style={style}
        _focus={focus}
      >
        <Flex gap={4} alignItems='center'>
          <AssetIcon assetId={asset.assetId} size='sm' pairProps={assetIconPairProps} />
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
        {(isConnected || isDemoWallet) && !hideAssetBalance && (
          <Flex flexDir='column' justifyContent='flex-end' alignItems='flex-end'>
            <Amount.Fiat
              color='var(--chakra-colors-chakra-body-text)'
              value={userCurrencyBalance}
            />
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
  },
)
