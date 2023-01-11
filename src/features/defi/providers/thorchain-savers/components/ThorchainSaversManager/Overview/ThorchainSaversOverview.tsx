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
import { serializeUserStakingId, toOpportunityId } from 'state/slices/opportunitiesSlice/utils'
import {
  selectAssetById,
  selectAssets,
  selectEarnUserStakingOpportunityByUserStakingId,
  selectFirstAccountIdByChainId,
  selectHighestBalanceAccountIdByStakingId,
  selectMarketDataById,
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

  // Placeholder for cap amounts
  // If the cap limit is 0 we should hide these components as this should mean caps are disabled
  // TODO(gomes): opportunity.savers_supply opportunitySpecific.max_savers_supply
  const capLimit = 500
  const capUsed = 250
  const capPercentaged = bnOrZero(capUsed).div(capLimit).times(100).toNumber()
  const isCapUsed = bnOrZero(capLimit).gt(0) && bnOrZero(capPercentaged).eq(100)

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

  const opportunityData = useAppSelector(state =>
    selectEarnUserStakingOpportunityByUserStakingId(state, opportunityDataFilter),
  )

  const underlyingAssetsFiatBalanceCryptoPrecision = useMemo(() => {
    if (!asset || !opportunityData?.underlyingAssetId) return '0'

    const cryptoAmount = bnOrZero(opportunityData?.stakedAmountCryptoBaseUnit)
      .div(bn(10).pow(asset.precision))
      .toString()
    const price = marketData.price
    return bnOrZero(cryptoAmount).times(price).toString()
  }, [
    asset,
    marketData,
    opportunityData?.stakedAmountCryptoBaseUnit,
    opportunityData?.underlyingAssetId,
  ])

  const underlyingAssetId = useMemo(
    () => opportunityData?.underlyingAssetIds?.[0],
    [opportunityData?.underlyingAssetIds],
  )
  const underlyingAsset: Asset | undefined = useMemo(
    () => assets[underlyingAssetId ?? ''],
    [assets, underlyingAssetId],
  )
  const underlyingAssetsWithBalancesAndIcons = useAppSelector(state =>
    selectUnderlyingStakingAssetsWithBalancesAndIcons(state, opportunityDataFilter),
  )

  const menu: DefiButtonProps[] = useMemo(() => {
    if (!opportunityData) return []

    return makeDefaultMenu(isCapUsed)
  }, [opportunityData, isCapUsed])

  const renderVaultCap = useMemo(() => {
    return (
      <Flex direction='column' gap={2}>
        <Flex justifyContent='space-between' alignItems='center'>
          <HelperTooltip label={translate('defi.modals.saversVaults.vaultCapTooltip')}>
            <Text fontWeight='medium' translation='defi.modals.saversVaults.vaultCap' />
          </HelperTooltip>
          <Flex gap={1}>
            <Amount.Fiat value={capUsed} />
            <Amount.Fiat value={capLimit} prefix='/' color='gray.500' />
          </Flex>
        </Flex>
        {bnOrZero(capPercentaged).eq(100) ? (
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
            value={capPercentaged}
            size='sm'
            borderRadius='md'
            colorScheme={bnOrZero(capPercentaged).lt(100) ? 'green' : 'red'}
          />
        )}
      </Flex>
    )
  }, [alertBg, capPercentaged, translate, underlyingAsset?.symbol])

  if (!opportunityData) {
    return (
      <Center minW='500px' minH='350px'>
        <CircularProgress />
      </Center>
    )
  }

  if (!asset) return null
  if (!underlyingAssetsWithBalancesAndIcons || !opportunityData) return null

  return (
    <Overview
      accountId={accountId}
      onAccountIdChange={handleAccountIdChange}
      asset={asset}
      name={opportunityData.name ?? ''}
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
      tvl={bnOrZero(opportunityData.tvl).toFixed(2)}
      apy={opportunityData.apy}
      menu={menu}
      postChildren={bnOrZero(capLimit).gt(0) ? renderVaultCap : null}
    />
  )
}
