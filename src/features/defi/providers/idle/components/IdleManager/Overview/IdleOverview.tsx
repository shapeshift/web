import { ArrowDownIcon, ArrowUpIcon } from '@chakra-ui/icons'
import { Box, Center, Flex, Tag } from '@chakra-ui/react'
import type { AccountId } from '@shapeshiftoss/caip'
import { ethChainId, toAssetId } from '@shapeshiftoss/caip'
import type { DefiButtonProps } from 'features/defi/components/DefiActionButtons'
import type { AssetWithBalance } from 'features/defi/components/Overview/Overview'
import { Overview } from 'features/defi/components/Overview/Overview'
import type {
  DefiParams,
  DefiQueryParams,
} from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { DefiAction } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { useMemo, useState } from 'react'
import { FaGift } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'
import type { AccountDropdownProps } from 'components/AccountDropdown/AccountDropdown'
import { CircularProgress } from 'components/CircularProgress/CircularProgress'
import { Text } from 'components/Text'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'
import type { Asset } from 'lib/asset-service'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { isSome } from 'lib/utils'
import { useGetAssetDescriptionQuery } from 'state/slices/assetsSlice/assetsSlice'
import { IdleTag } from 'state/slices/opportunitiesSlice/resolvers/idle/constants'
import { getIdleInvestor } from 'state/slices/opportunitiesSlice/resolvers/idle/idleInvestorSingleton'
import type { TagDescription } from 'state/slices/opportunitiesSlice/types'
import {
  makeDefiProviderDisplayName,
  serializeUserStakingId,
  toOpportunityId,
} from 'state/slices/opportunitiesSlice/utils'
import {
  selectAssetById,
  selectAssets,
  selectEarnUserStakingOpportunityByUserStakingId,
  selectFirstAccountIdByChainId,
  selectHighestBalanceAccountIdByStakingId,
  selectMarketDataById,
  selectPortfolioCryptoBalanceBaseUnitByFilter,
  selectSelectedLocale,
  selectUnderlyingStakingAssetsWithBalancesAndIcons,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { IdleEmpty } from './IdleEmpty'

const idleTagDescriptions: Record<IdleTag, TagDescription> = {
  [IdleTag.BestYield]: {
    title: 'idle.bestYield.title',
    description: 'idle.bestYield.body',
  },
  [IdleTag.JuniorTranche]: {
    title: 'idle.juniorTranche.title',
    description: 'idle.juniorTranche.body',
  },
  [IdleTag.SeniorTranche]: {
    title: 'idle.seniorTranche.title',
    description: 'idle.seniorTranche.body',
  },
}

type IdleOverviewProps = {
  accountId: AccountId | undefined
  onAccountIdChange: AccountDropdownProps['onChange']
}

export const IdleOverview: React.FC<IdleOverviewProps> = ({
  accountId,
  onAccountIdChange: handleAccountIdChange,
}) => {
  const idleInvestor = useMemo(() => getIdleInvestor(), [])
  const translate = useTranslate()
  const { query } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const [hideEmptyState, setHideEmptyState] = useState(false)
  const { chainId, contractAddress, assetReference } = query

  const assetNamespace = 'erc20'
  const assetId = toAssetId({ chainId, assetNamespace, assetReference })

  const vaultTokenId = toAssetId({
    chainId,
    assetNamespace,
    assetReference: contractAddress,
  })
  const assets = useAppSelector(selectAssets)
  const vaultAsset = useAppSelector(state => selectAssetById(state, vaultTokenId))
  if (!vaultAsset) throw new Error(`Asset not found for AssetId ${vaultTokenId}`)

  const marketData = useAppSelector(state => selectMarketDataById(state, assetId))
  // user info
  const balanceFilter = useMemo(
    () => ({ accountId, assetId: vaultTokenId }),
    [accountId, vaultTokenId],
  )
  // user info
  const balance = useAppSelector(state =>
    selectPortfolioCryptoBalanceBaseUnitByFilter(state, balanceFilter),
  )

  const cryptoAmountAvailable = useMemo(
    () => bnOrZero(balance).div(bn(10).pow(vaultAsset?.precision)),
    [balance, vaultAsset?.precision],
  )
  const fiatAmountAvailable = useMemo(
    () => bnOrZero(cryptoAmountAvailable).times(marketData.price),
    [cryptoAmountAvailable, marketData.price],
  )

  const opportunityId = useMemo(
    () => toOpportunityId({ chainId, assetNamespace: 'erc20', assetReference: contractAddress }),
    [chainId, contractAddress],
  )
  const highestBalanceAccountIdFilter = useMemo(
    () => ({ stakingId: opportunityId }),
    [opportunityId],
  )
  const highestBalanceAccountId = useAppSelector(state =>
    selectHighestBalanceAccountIdByStakingId(state, highestBalanceAccountIdFilter),
  )
  const defaultAccountId = useAppSelector(state => selectFirstAccountIdByChainId(state, ethChainId))
  const opportunityDataFilter = useMemo(
    () => ({
      userStakingId: serializeUserStakingId(
        (accountId ?? highestBalanceAccountId ?? defaultAccountId)!,
        toOpportunityId({
          chainId,
          assetNamespace: 'erc20',
          assetReference: contractAddress,
        }),
      ),
    }),
    [accountId, chainId, contractAddress, defaultAccountId, highestBalanceAccountId],
  )

  const opportunityData = useAppSelector(state =>
    selectEarnUserStakingOpportunityByUserStakingId(state, opportunityDataFilter),
  )

  const defaultMenu: DefiButtonProps[] = useMemo(
    () => [
      {
        label: 'common.deposit',
        icon: <ArrowUpIcon />,
        action: DefiAction.Deposit,
        isDisabled: Boolean(!opportunityData?.active),
      },
      {
        label: 'common.withdraw',
        icon: <ArrowDownIcon />,
        action: DefiAction.Withdraw,
      },
    ],
    [opportunityData?.active],
  )

  const underlyingAssetId = useMemo(
    () => opportunityData?.underlyingAssetIds?.[0],
    [opportunityData?.underlyingAssetIds],
  )
  const underlyingAsset: Asset | undefined = useMemo(
    () => assets[underlyingAssetId ?? ''],
    [assets, underlyingAssetId],
  )
  if (!underlyingAsset) throw new Error(`Asset not found for AssetId ${underlyingAssetId}`)

  const underlyingAssetsWithBalancesAndIcons = useAppSelector(state =>
    selectUnderlyingStakingAssetsWithBalancesAndIcons(state, opportunityDataFilter),
  )

  const selectedLocale = useAppSelector(selectSelectedLocale)
  const descriptionQuery = useGetAssetDescriptionQuery({
    assetId: underlyingAssetId,
    selectedLocale,
  })

  const rewardAssets: AssetWithBalance[] = useMemo(() => {
    if (!opportunityData?.rewardsCryptoBaseUnit?.amounts.length) return []

    return opportunityData!.rewardsCryptoBaseUnit.amounts
      .map((amount, i) => {
        if (!opportunityData?.rewardAssetIds?.[i]) return undefined
        if (!assets[opportunityData.rewardAssetIds[i]]) return undefined
        if (bnOrZero(amount).isZero()) return undefined
        const rewardAsset = assets[opportunityData.rewardAssetIds[i]]
        if (!rewardAsset) return undefined
        return {
          ...rewardAsset,
          cryptoBalancePrecision: bnOrZero(amount)
            .div(bn(10).pow(assets[opportunityData.rewardAssetIds[i]]?.precision ?? '0'))
            .toFixed(6),
        }
      })
      .filter(isSome)
  }, [assets, opportunityData])

  const hasClaimBalance = useMemo(() => {
    if (!opportunityData?.rewardAssetIds?.length) return false

    return opportunityData.rewardAssetIds?.some((_rewardAssetId, i) =>
      bnOrZero(opportunityData?.rewardsCryptoBaseUnit?.amounts[i]).gt(0),
    )
  }, [opportunityData?.rewardAssetIds, opportunityData?.rewardsCryptoBaseUnit])

  const menu: DefiButtonProps[] = useMemo(() => {
    if (!(contractAddress && idleInvestor && opportunityData)) return defaultMenu
    if (!opportunityData?.rewardsCryptoBaseUnit?.amounts.length) return defaultMenu

    return [
      ...defaultMenu,
      {
        icon: <FaGift />,
        colorScheme: 'green',
        label: 'common.claim',
        variant: 'ghost-filled',
        action: DefiAction.Claim,
        isDisabled: !hasClaimBalance,
        toolTip: translate('defi.modals.overview.noWithdrawals'),
      },
    ]
  }, [contractAddress, idleInvestor, opportunityData, defaultMenu, hasClaimBalance, translate])

  const renderTags = useMemo(() => {
    return opportunityData?.tags?.map(tag => {
      if (idleTagDescriptions[tag as IdleTag]) {
        const tagDetails = idleTagDescriptions[tag as IdleTag]
        return (
          <Flex flexDir='column' px={8} py={4} key={tag}>
            <Text fontSize='lg' fontWeight='medium' translation={tagDetails.title} />
            {tagDetails.description && (
              <Text color='text.subtle' translation={tagDetails.description} />
            )}
          </Flex>
        )
      } else return <Tag key={tag}>{tag}</Tag>
    })
  }, [opportunityData?.tags])

  if (!opportunityData) {
    return (
      <Center minW='500px' minH='350px'>
        <CircularProgress />
      </Center>
    )
  }

  if (!underlyingAssetsWithBalancesAndIcons || !opportunityData) return null

  if (fiatAmountAvailable.eq(0) && !hideEmptyState) {
    return (
      <IdleEmpty
        tags={opportunityData.tags as IdleTag[]}
        apy={opportunityData.apy}
        assetId={underlyingAssetId ?? ''}
        onClick={() => setHideEmptyState(true)}
      />
    )
  }

  return (
    <Overview
      accountId={accountId}
      onAccountIdChange={handleAccountIdChange}
      asset={vaultAsset}
      name={opportunityData.name ?? ''}
      opportunityFiatBalance={fiatAmountAvailable.toFixed(2)}
      underlyingAssetsCryptoPrecision={underlyingAssetsWithBalancesAndIcons}
      provider={makeDefiProviderDisplayName({
        provider: opportunityData.provider,
        assetName: vaultAsset.name,
      })}
      description={{
        description: underlyingAsset.description,
        isLoaded: !descriptionQuery.isLoading,
        isTrustedDescription: underlyingAsset.isTrustedDescription,
      }}
      tvl={bnOrZero(opportunityData.tvl).toFixed(2)}
      apy={opportunityData.apy}
      menu={menu}
      rewardAssetsCryptoPrecision={rewardAssets}
    >
      <Box>{renderTags}</Box>
    </Overview>
  )
}
