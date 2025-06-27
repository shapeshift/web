import { Flex, forwardRef } from '@chakra-ui/react'
import type { Asset } from '@shapeshiftoss/types'
import { useCallback, useMemo } from 'react'

import { ResultButton } from '../ResultButton'

import { Amount } from '@/components/Amount/Amount'
import { AssetIcon } from '@/components/AssetIcon'
import { RawText } from '@/components/Text'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import { middleEllipsis } from '@/lib/utils'
import {
  selectPortfolioCryptoPrecisionBalanceByFilter,
  selectPortfolioUserCurrencyBalanceByAssetId,
} from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

type AssetResultProps = {
  asset: Asset
  index: number
  activeIndex?: number
  onClick: (arg: Asset) => void
}

export const AssetResult = forwardRef<AssetResultProps, 'div'>(
  ({ asset, index, activeIndex, onClick }, ref) => {
    const selected = index === activeIndex
    const filter = useMemo(() => ({ assetId: asset.assetId }), [asset.assetId])
    const cryptoHumanBalance = useAppSelector(s =>
      selectPortfolioCryptoPrecisionBalanceByFilter(s, filter),
    )
    const fiatBalance =
      useAppSelector(s => selectPortfolioUserCurrencyBalanceByAssetId(s, filter)) ?? '0'
    const handleSearchResultAssetTypeClick = useCallback(() => {
      onClick(asset)
    }, [asset, onClick])

    return (
      <ResultButton
        ref={ref}
        aria-selected={selected ? true : undefined}
        onClick={handleSearchResultAssetTypeClick}
      >
        <Flex gap={2} flex={1}>
          <AssetIcon showNetworkIcon={true} assetId={asset.assetId} size='sm' />
          <Flex flexDir='column' alignItems='flex-start' textAlign='left'>
            <RawText
              color='chakra-body-text'
              width='100%'
              textOverflow='ellipsis'
              overflow='hidden'
              whiteSpace='nowrap'
            >
              {asset.name}
            </RawText>
            <Flex alignItems='center' gap={2}>
              <RawText size='xs' variant='sub-text'>
                {asset.symbol}
              </RawText>
              {asset.id && (
                <RawText size='xs' variant='sub-text'>
                  {middleEllipsis(asset.id)}
                </RawText>
              )}
            </Flex>
          </Flex>
        </Flex>
        {bnOrZero(cryptoHumanBalance).gt(0) && (
          <Flex flexDir='column' alignItems='flex-end'>
            <Amount.Fiat color='chakra-body-text' value={fiatBalance} />
            <Amount.Crypto
              size='xs'
              variant='sub-text'
              value={cryptoHumanBalance}
              symbol={asset.symbol}
            />
          </Flex>
        )}
      </ResultButton>
    )
  },
)
