import { ArrowDownIcon, ArrowUpIcon } from '@chakra-ui/icons'
import {
  Alert,
  AlertDescription,
  AlertIcon,
  AlertTitle,
  Button,
  Center,
  Flex,
  Link,
  Progress,
  useColorModeValue,
} from '@chakra-ui/react'
import type { Asset } from '@shapeshiftoss/asset-service'
import type { AccountId } from '@shapeshiftoss/caip'
import { ethChainId, toAssetId } from '@shapeshiftoss/caip'
import type { DefiButtonProps } from 'features/defi/components/DefiActionButtons'
import { Overview } from 'features/defi/components/Overview/Overview'
import type {
  DefiParams,
  DefiQueryParams,
  DefiType,
} from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { DefiAction, DefiProvider } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { useMemo } from 'react'
import { FaTwitter } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'
import type { AccountDropdownProps } from 'components/AccountDropdown/AccountDropdown'
import { Amount } from 'components/Amount/Amount'
import { CircularProgress } from 'components/CircularProgress/CircularProgress'
import { HelperTooltip } from 'components/HelperTooltip/HelperTooltip'
import { Text } from 'components/Text'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import type { OpportunityMetadata, StakingId } from 'state/slices/opportunitiesSlice/types'
import { serializeUserStakingId, toOpportunityId } from 'state/slices/opportunitiesSlice/utils'
import {
  selectAssetById,
  selectAssets,
  selectEarnUserStakingOpportunityByUserStakingId,
  selectFirstAccountIdByChainId,
  selectHighestBalanceAccountIdByStakingId,
  selectMarketDataById,
  selectStakingOpportunitiesById,
  selectUnderlyingStakingAssetsWithBalancesAndIcons,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

const makeDefaultMenu = (isFull?: boolean): DefiButtonProps[] => [
  ...(isFull
    ? []
    : [
        {
          label: 'common.deposit',
          icon: <ArrowUpIcon />,
          action: DefiAction.Deposit,
          isDisabled: isFull,
        },
      ]),
  {
    label: 'common.withdraw',
    icon: <ArrowDownIcon />,
    action: DefiAction.Withdraw,
  },
]

type OverviewProps = {
  accountId: AccountId | undefined
  onAccountIdChange: AccountDropdownProps['onChange']
}

export const ThorchainSaversOverview: React.FC<OverviewProps> = ({
  accountId,
  onAccountIdChange: handleAccountIdChange,
}) => {
  const translate = useTranslate()
  const { query } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const { chainId, assetReference, assetNamespace } = query
  const alertBg = useColorModeValue('gray.200', 'gray.900')

  const assetId = toAssetId({
    chainId,
    assetNamespace,
    assetReference,
  })
  const assets = useAppSelector(selectAssets)
  const asset = useAppSelector(state => selectAssetById(state, assetId))

  const marketData = useAppSelector(state => selectMarketDataById(state, assetId))

  const opportunityId = useMemo(
    () => toOpportunityId({ chainId, assetNamespace, assetReference }),
    [assetNamespace, assetReference, chainId],
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
          assetNamespace,
          assetReference,
        }),
      ),
    }),
    [accountId, assetNamespace, assetReference, chainId, defaultAccountId, highestBalanceAccountId],
  )

  const earnOpportunityData = useAppSelector(state =>
    selectEarnUserStakingOpportunityByUserStakingId(state, opportunityDataFilter),
  )

  const opportunitiesMetadata = useAppSelector(state => selectStakingOpportunitiesById(state))

  const opportunityMetadata = useMemo(
    () => opportunitiesMetadata[assetId as StakingId],
    [assetId, opportunitiesMetadata],
  ) as OpportunityMetadata<DefiProvider.ThorchainSavers, DefiType.Staking> | undefined

  const currentCapFillPercentage = bnOrZero(
    opportunityMetadata?.opportunitySpecific?.saversSupplyIncludeAccruedFiat,
  )
    .div(bnOrZero(opportunityMetadata?.opportunitySpecific?.saversMaxSupplyFiat))
    .times(100)
    .toNumber()
  const isCapUsed =
    bnOrZero(opportunityMetadata?.opportunitySpecific?.saversMaxSupplyFiat).gt(0) &&
    bnOrZero(currentCapFillPercentage).eq(100)

  const underlyingAssetsFiatBalanceCryptoPrecision = useMemo(() => {
    if (!asset || !earnOpportunityData?.underlyingAssetId) return '0'

    const cryptoAmount = bnOrZero(earnOpportunityData?.stakedAmountCryptoBaseUnit)
      .div(bn(10).pow(asset.precision))
      .toString()
    const price = marketData.price
    return bnOrZero(cryptoAmount).times(price).toString()
  }, [
    asset,
    marketData,
    earnOpportunityData?.stakedAmountCryptoBaseUnit,
    earnOpportunityData?.underlyingAssetId,
  ])

  const underlyingAssetId = useMemo(
    () => earnOpportunityData?.underlyingAssetIds?.[0],
    [earnOpportunityData?.underlyingAssetIds],
  )
  const underlyingAsset: Asset | undefined = useMemo(
    () => assets[underlyingAssetId ?? ''],
    [assets, underlyingAssetId],
  )
  const underlyingAssetsWithBalancesAndIcons = useAppSelector(state =>
    selectUnderlyingStakingAssetsWithBalancesAndIcons(state, opportunityDataFilter),
  )

  const menu: DefiButtonProps[] = useMemo(() => {
    if (!earnOpportunityData) return []

    return makeDefaultMenu(isCapUsed)
  }, [earnOpportunityData, isCapUsed])

  const renderVaultCap = useMemo(() => {
    return (
      <Flex direction='column' gap={2}>
        <Flex justifyContent='space-between' alignItems='center'>
          <HelperTooltip label={translate('defi.modals.saversVaults.vaultCapTooltip')}>
            <Text fontWeight='medium' translation='defi.modals.saversVaults.vaultCap' />
          </HelperTooltip>
          <Flex gap={1}>
            <Amount.Fiat
              value={opportunityMetadata?.opportunitySpecific?.saversSupplyIncludeAccruedFiat ?? 0}
            />
            <Amount.Fiat
              value={opportunityMetadata?.opportunitySpecific?.saversMaxSupplyFiat ?? 0}
              prefix='/'
              color='gray.500'
            />
          </Flex>
        </Flex>
        {bnOrZero(currentCapFillPercentage).eq(100) ? (
          <Alert status='warning' flexDir='column' bg={alertBg} py={4}>
            <AlertIcon />
            <AlertTitle>{translate('defi.modals.saversVaults.haltedTitle')}</AlertTitle>
            <AlertDescription>
              {translate('defi.modals.saversVaults.haltedDescription')}
            </AlertDescription>
            <Button
              as={Link}
              href={`https://twitter.com/intent/tweet?text=Hey%20%40THORChain%20%23raisethecaps%20already%20so%20I%20can%20deposit%20%23${underlyingAsset?.symbol}%20into%20a%20savers%20vault%20at%20%40ShapeShift`}
              isExternal
              mt={4}
              colorScheme='twitter'
              rightIcon={<FaTwitter />}
            >
              @THORChain
            </Button>
          </Alert>
        ) : (
          <Progress
            value={currentCapFillPercentage}
            size='sm'
            borderRadius='md'
            colorScheme={bnOrZero(currentCapFillPercentage).lt(100) ? 'green' : 'red'}
          />
        )}
      </Flex>
    )
  }, [
    alertBg,
    currentCapFillPercentage,
    opportunityMetadata?.opportunitySpecific?.saversMaxSupplyFiat,
    opportunityMetadata?.opportunitySpecific?.saversSupplyIncludeAccruedFiat,
    translate,
    underlyingAsset?.symbol,
  ])

  if (!earnOpportunityData) {
    return (
      <Center minW='500px' minH='350px'>
        <CircularProgress />
      </Center>
    )
  }

  if (!asset) return null
  if (!underlyingAssetsWithBalancesAndIcons || !earnOpportunityData) return null

  return (
    <Overview
      accountId={accountId}
      onAccountIdChange={handleAccountIdChange}
      asset={asset}
      name={earnOpportunityData.name ?? ''}
      opportunityFiatBalance={underlyingAssetsFiatBalanceCryptoPrecision}
      underlyingAssetsCryptoPrecision={underlyingAssetsWithBalancesAndIcons}
      provider={DefiProvider.ThorchainSavers}
      description={{
        description: translate('defi.modals.saversVaults.description', {
          asset: underlyingAsset?.symbol ?? '',
        }),
        isLoaded: !!underlyingAsset?.symbol,
        isTrustedDescription: true,
      }}
      tvl={bnOrZero(earnOpportunityData.tvl).toFixed(2)}
      apy={earnOpportunityData.apy}
      menu={menu}
      postChildren={
        bnOrZero(opportunityMetadata?.opportunitySpecific?.saversMaxSupplyFiat).gt(0)
          ? renderVaultCap
          : null
      }
    />
  )
}
