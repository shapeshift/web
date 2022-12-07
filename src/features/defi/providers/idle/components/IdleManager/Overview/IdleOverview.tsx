import { ArrowDownIcon, ArrowUpIcon } from '@chakra-ui/icons'
import { Box, Center, Flex, Tag } from '@chakra-ui/react'
import type { Asset } from '@shapeshiftoss/asset-service'
import type { AccountId } from '@shapeshiftoss/caip'
import { ethChainId, toAssetId } from '@shapeshiftoss/caip'
import type { DefiButtonProps } from 'features/defi/components/DefiActionButtons'
import { Overview } from 'features/defi/components/Overview/Overview'
import type {
  DefiParams,
  DefiQueryParams,
} from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { DefiAction } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { getIdleInvestor } from 'features/defi/contexts/IdleProvider/idleInvestorSingleton'
import { useMemo } from 'react'
import { FaGift } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'
import type { AccountDropdownProps } from 'components/AccountDropdown/AccountDropdown'
import { CircularProgress } from 'components/CircularProgress/CircularProgress'
import { RawText } from 'components/Text'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { isSome } from 'lib/utils'
import { useGetAssetDescriptionQuery } from 'state/slices/assetsSlice/assetsSlice'
import type { BASE_OPPORTUNITIES_BY_ID } from 'state/slices/opportunitiesSlice/resolvers/idle/constants'
import type { OpportunityMetadata, TagDescription } from 'state/slices/opportunitiesSlice/types'
import { serializeUserStakingId, toOpportunityId } from 'state/slices/opportunitiesSlice/utils'
import {
  selectAssetById,
  selectAssets,
  selectEarnUserStakingOpportunityByUserStakingId,
  selectFirstAccountIdByChainId,
  selectHighestBalanceAccountIdByStakingId,
  selectMarketDataById,
  selectPortfolioCryptoBalanceByFilter,
  selectSelectedLocale,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

const defaultMenu: DefiButtonProps[] = [
  {
    label: 'common.deposit',
    icon: <ArrowUpIcon />,
    action: DefiAction.Deposit,
  },
  {
    label: 'common.withdraw',
    icon: <ArrowDownIcon />,
    action: DefiAction.Withdraw,
  },
]

type BaseOpportunityKeys = keyof typeof BASE_OPPORTUNITIES_BY_ID
type Tags = typeof BASE_OPPORTUNITIES_BY_ID[BaseOpportunityKeys]

const IdleTagDescriptions: Record<Tags, TagDescription> = {
  'Best Yield': {
    title: 'What is Best Yield?',
    description:
      'Earn yield automatically across multiple defi protocols. The Best-Yield allocation strategy maximizes returns by automatically shifting capital as opportunities arise.',
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
  const marketData = useAppSelector(state => selectMarketDataById(state, assetId))
  // user info
  const balanceFilter = useMemo(
    () => ({ accountId, assetId: vaultTokenId }),
    [accountId, vaultTokenId],
  )
  // user info
  const balance = useAppSelector(state =>
    selectPortfolioCryptoBalanceByFilter(state, balanceFilter),
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

  const underlyingAssetId = useMemo(
    () => opportunityData?.underlyingAssetIds?.[0],
    [opportunityData?.underlyingAssetIds],
  )
  const underlyingAsset: Asset | undefined = useMemo(
    () => assets[underlyingAssetId ?? ''],
    [assets, underlyingAssetId],
  )
  const underlyingAssets = useMemo(
    () => [
      {
        ...underlyingAsset,
        cryptoBalancePrecision: cryptoAmountAvailable.toPrecision(),
        allocationPercentage: '1',
      },
    ],
    [cryptoAmountAvailable, underlyingAsset],
  )

  const selectedLocale = useAppSelector(selectSelectedLocale)
  const descriptionQuery = useGetAssetDescriptionQuery({
    assetId: underlyingAssetId,
    selectedLocale,
  })

  const rewardAssets = useMemo(() => {
    if (!opportunityData?.rewardsAmountsCryptoBaseUnit?.length) return []

    return opportunityData!.rewardsAmountsCryptoBaseUnit
      .map((amount, i) => {
        if (!opportunityData?.rewardAssetIds?.[i]) return undefined
        if (!assets[opportunityData.rewardAssetIds[i]]) return undefined
        if (bnOrZero(amount).isZero()) return undefined
        return {
          ...assets[opportunityData.rewardAssetIds[i]],
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
      bnOrZero(opportunityData?.rewardsAmountsCryptoBaseUnit?.[i]).gt(0),
    )
  }, [opportunityData?.rewardAssetIds, opportunityData?.rewardsAmountsCryptoBaseUnit])

  const menu: DefiButtonProps[] = useMemo(() => {
    if (!(contractAddress && idleInvestor && opportunityData)) return defaultMenu
    if (!opportunityData?.rewardsAmountsCryptoBaseUnit?.length) return defaultMenu

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
  }, [contractAddress, idleInvestor, opportunityData, hasClaimBalance, translate])

  const renderTags = useMemo(() => {
    return opportunityData?.tags?.map(tag => {
      if (IdleTagDescriptions[tag]) {
        const tagDetails = IdleTagDescriptions[tag]
        return (
          <Flex flexDir='column' px={8} py={4}>
            <RawText>{tagDetails.title}</RawText>
            <RawText>{tagDetails.description}</RawText>
          </Flex>
        )
      }
      return <Tag>{tag}</Tag>
    })
  }, [opportunityData?.tags])

  if (!opportunityData) {
    return (
      <Center minW='500px' minH='350px'>
        <CircularProgress />
      </Center>
    )
  }

  if (!underlyingAssets || !opportunityData) return null

  return (
    <Overview
      accountId={accountId}
      onAccountIdChange={handleAccountIdChange}
      asset={vaultAsset}
      name={opportunityData.name ?? ''}
      opportunityFiatBalance={fiatAmountAvailable.toFixed(2)}
      underlyingAssetsCryptoPrecision={underlyingAssets}
      provider='Idle Finance'
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
