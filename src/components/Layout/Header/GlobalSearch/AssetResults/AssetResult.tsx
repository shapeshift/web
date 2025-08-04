import { Flex, forwardRef, Icon } from '@chakra-ui/react'
import type { Asset } from '@shapeshiftoss/types'
import { useCallback, useMemo } from 'react'
import { TbAlertTriangle } from 'react-icons/tb'
import { useTranslate } from 'react-polyglot'

import { ResultButton } from '../ResultButton'

import { Amount } from '@/components/Amount/Amount'
import { AssetIcon } from '@/components/AssetIcon'
import { RawText } from '@/components/Text'
import { TooltipWithTouch } from '@/components/TooltipWithTouch'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import { middleEllipsis } from '@/lib/utils'
import { preferences } from '@/state/slices/preferencesSlice/preferencesSlice'
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
    const translate = useTranslate()
    const filter = useMemo(() => ({ assetId: asset.assetId }), [asset.assetId])
    const cryptoHumanBalance = useAppSelector(s =>
      selectPortfolioCryptoPrecisionBalanceByFilter(s, filter),
    )
    const spamMarkedAssetIds = useAppSelector(preferences.selectors.selectSpamMarkedAssetIds)
    const fiatBalance =
      useAppSelector(s => selectPortfolioUserCurrencyBalanceByAssetId(s, filter)) ?? '0'
    const handleSearchResultAssetTypeClick = useCallback(() => {
      onClick(asset)
    }, [asset, onClick])

    const isSpamAsset = spamMarkedAssetIds.includes(asset.assetId)

    return (
      <ResultButton
        ref={ref}
        aria-selected={selected ? true : undefined}
        onClick={handleSearchResultAssetTypeClick}
      >
        <Flex gap={2} flex={1}>
          <AssetIcon showNetworkIcon={true} assetId={asset.assetId} size='sm' />
          <Flex flexDir='column' alignItems='flex-start' textAlign='left'>
            <Flex gap={1} alignItems='center'>
              <RawText
                color='chakra-body-text'
                width='100%'
                textOverflow='ellipsis'
                overflow='hidden'
                whiteSpace='nowrap'
              >
                {asset.name}
              </RawText>
              {isSpamAsset && (
                <TooltipWithTouch label={translate('assets.spam.marked')}>
                  <Icon as={TbAlertTriangle} color='yellow.500' strokeWidth={2} mb={-0.5} />
                </TooltipWithTouch>
              )}
            </Flex>
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
