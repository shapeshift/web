import { WarningIcon } from '@chakra-ui/icons'
import { Flex, Tooltip } from '@chakra-ui/react'
import type { ChainId } from '@shapeshiftoss/caip'
import { ChainAdapterDisplayName } from '@shapeshiftoss/chain-adapters'
import { KnownChainIds } from '@shapeshiftoss/types'
import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'

import { TooltipWithTouch } from '../TooltipWithTouch'

import { Amount } from '@/components/Amount/Amount'
import { LazyLoadAvatar } from '@/components/LazyLoadAvatar'
import {
  selectFeeAssetByChainId,
  selectPortfolioTotalChainIdBalanceUserCurrency,
} from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

const attemptGetLabelFromChainId = (chainId: string): ChainAdapterDisplayName | null => {
  switch (chainId) {
    case KnownChainIds.EthereumMainnet:
      return ChainAdapterDisplayName.Ethereum
    case KnownChainIds.AvalancheMainnet:
      return ChainAdapterDisplayName.Avalanche
    case KnownChainIds.OptimismMainnet:
      return ChainAdapterDisplayName.Optimism
    case KnownChainIds.BnbSmartChainMainnet:
      return ChainAdapterDisplayName.BnbSmartChain
    case KnownChainIds.PolygonMainnet:
      return ChainAdapterDisplayName.Polygon
    case KnownChainIds.GnosisMainnet:
      return ChainAdapterDisplayName.Gnosis
    case KnownChainIds.ArbitrumMainnet:
      return ChainAdapterDisplayName.Arbitrum
    case KnownChainIds.ArbitrumNovaMainnet:
      return ChainAdapterDisplayName.ArbitrumNova
    case KnownChainIds.BaseMainnet:
      return ChainAdapterDisplayName.Base
    case KnownChainIds.BitcoinMainnet:
      return ChainAdapterDisplayName.Bitcoin
    case KnownChainIds.BitcoinCashMainnet:
      return ChainAdapterDisplayName.BitcoinCash
    case KnownChainIds.DogecoinMainnet:
      return ChainAdapterDisplayName.Dogecoin
    case KnownChainIds.LitecoinMainnet:
      return ChainAdapterDisplayName.Litecoin
    case KnownChainIds.CosmosMainnet:
      return ChainAdapterDisplayName.Cosmos
    case KnownChainIds.ThorchainMainnet:
      return ChainAdapterDisplayName.Thorchain
    case KnownChainIds.MayachainMainnet:
      return ChainAdapterDisplayName.Mayachain
    case KnownChainIds.SolanaMainnet:
      return ChainAdapterDisplayName.Solana
    default:
      return null
  }
}

type ChainRowProps = {
  chainId: ChainId
  includeBalance?: boolean
}
export const ChainRow: React.FC<ChainRowProps> = ({ chainId, includeBalance }) => {
  const feeAsset = useAppSelector(state => selectFeeAssetByChainId(state, chainId))
  const chainFiatBalanceFilter = useMemo(() => ({ chainId }), [chainId])
  const chainFiatBalance = useAppSelector(s =>
    selectPortfolioTotalChainIdBalanceUserCurrency(s, chainFiatBalanceFilter),
  )

  const translate = useTranslate()

  if (!feeAsset) {
    const maybeChainLabel = attemptGetLabelFromChainId(chainId)
    if (maybeChainLabel === null) return null

    return (
      <TooltipWithTouch label={translate('chainAdapters.errors.getChainInfo')}>
        <Flex alignItems='center' gap={4} opacity={0.5}>
          <WarningIcon color='red.500' width={6} height={6} />
          {maybeChainLabel}
        </Flex>
      </TooltipWithTouch>
    )
  }

  return (
    <Flex alignItems='center' gap={4}>
      <LazyLoadAvatar src={feeAsset.networkIcon ?? feeAsset.icon} size='xs' />
      {feeAsset.networkName ?? feeAsset.name}
      {includeBalance && <Amount.Fiat ml='auto' value={chainFiatBalance} />}
    </Flex>
  )
}
