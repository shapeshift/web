import { Flex, FormLabel, Stack } from '@chakra-ui/react'
import type { AccountId, ChainId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { bnOrZero } from '@shapeshiftoss/utils'
import React, { memo, useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import type { AccountDropdownProps } from 'components/AccountDropdown/AccountDropdown'
import { AccountDropdown } from 'components/AccountDropdown/AccountDropdown'
import { TradeAssetSelect } from 'components/AssetSelection/AssetSelection'
import { Balance } from 'components/DeFi/components/Balance'
import { Text } from 'components/Text'
import { useModal } from 'hooks/useModal/useModal'
import {
  selectMarketDataByAssetIdUserCurrency,
  selectPortfolioCryptoPrecisionBalanceByFilter,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

export type TradeAmountInputFormValues = {
  amountFieldInput: string
  amountCryptoPrecision: string
  amountUserCurrency: string
}

const buttonProps = {
  variant: 'unstyled',
  display: 'flex',
  height: 'auto',
  lineHeight: '1',
  width: '100%',
}
const boxProps = { px: 0, m: 0, maxWidth: '220px' }

export type LimitOrderBuyAssetProps = {
  asset: Asset
  accountId?: AccountId
  isInputtingFiatSellAmount: boolean
  assetFilterPredicate: (asset: Asset) => boolean
  chainIdFilterPredicate: (chainId: ChainId) => boolean
  onAccountIdChange: AccountDropdownProps['onChange']
  onSetBuyAsset: (asset: Asset) => void
}

export const LimitOrderBuyAsset: React.FC<LimitOrderBuyAssetProps> = memo(
  ({
    asset,
    accountId,
    isInputtingFiatSellAmount,
    assetFilterPredicate,
    chainIdFilterPredicate,
    onAccountIdChange,
    onSetBuyAsset,
  }) => {
    const translate = useTranslate()
    const buyAssetSearch = useModal('buyTradeAssetSearch')

    const marketData = useAppSelector(state =>
      selectMarketDataByAssetIdUserCurrency(state, asset.assetId),
    )

    const filter = useMemo(
      () => ({
        accountId: accountId ?? '',
        assetId: asset.assetId,
      }),
      [accountId, asset],
    )
    const balance = useAppSelector(state =>
      selectPortfolioCryptoPrecisionBalanceByFilter(state, filter),
    )

    const fiatBalance = bnOrZero(balance).times(marketData.price).toString()

    const accountDropdownLabel = useMemo(
      () => (
        <Balance
          cryptoBalance={balance ?? ''}
          fiatBalance={fiatBalance ?? ''}
          symbol={asset.symbol}
          isFiat={isInputtingFiatSellAmount}
          label={`${translate('common.balance')}:`}
          textAlign='right'
        />
      ),
      [asset, balance, fiatBalance, isInputtingFiatSellAmount, translate],
    )

    const handleAssetClick = useCallback(() => {
      buyAssetSearch.open({
        onAssetClick: onSetBuyAsset,
        title: 'trade.tradeTo',
        assetFilterPredicate,
        chainIdFilterPredicate,
      })
    }, [assetFilterPredicate, buyAssetSearch, chainIdFilterPredicate, onSetBuyAsset])

    return (
      <Stack mt={4}>
        <Flex justifyContent='space-between' alignItems='center' px={6} width='full' mb={2}>
          <Flex alignItems='center'>
            <FormLabel mb={0} fontSize='sm'>
              <Text translation='limitOrder.youGet' />
            </FormLabel>
          </Flex>
          {balance && (
            <AccountDropdown
              defaultAccountId={accountId}
              assetId={asset.assetId}
              onChange={onAccountIdChange}
              disabled={false}
              autoSelectHighestBalance={false}
              buttonProps={buttonProps}
              boxProps={boxProps}
              showLabel={false}
              label={accountDropdownLabel}
            />
          )}
        </Flex>
        <TradeAssetSelect
          assetId={asset.assetId}
          onAssetClick={handleAssetClick}
          onAssetChange={onSetBuyAsset}
          onlyConnectedChains={false}
        />
      </Stack>
    )
  },
)
