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
import { DefiAction } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { getYearnInvestor } from 'features/defi/contexts/YearnProvider/yearnInvestorSingleton'
import { useMemo } from 'react'
import { FaGift, FaTwitter } from 'react-icons/fa'
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
  selectPortfolioCryptoBalanceByFilter,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

const makeDefaultMenu = (isExpired?: boolean, isDisabled?: boolean): DefiButtonProps[] => [
  ...(isExpired
    ? []
    : [
        {
          label: 'common.deposit',
          icon: <ArrowUpIcon />,
          action: DefiAction.Deposit,
          isDisabled,
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
  const yearnInvestor = useMemo(() => getYearnInvestor(), [])
  const translate = useTranslate()
  const { query } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const { chainId, contractAddress, assetReference } = query
  const alertBg = useColorModeValue('gray.200', 'gray.900')

  // Placeholder for cap amounts
  // If the cap limit is 0 we should hide these components as this should mean caps are disabled
  const capLimit = 500
  const capUsed = 250
  const capPercentaged = bnOrZero(capUsed).div(capLimit).times(100).toNumber()
  const isCapUsed = bnOrZero(capLimit).gt(0) && bnOrZero(capPercentaged).eq(100)

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
    () =>
      underlyingAsset
        ? [
            {
              ...underlyingAsset,
              cryptoBalancePrecision: cryptoAmountAvailable.toPrecision(),
              allocationPercentage: '1',
            },
          ]
        : [],
    [cryptoAmountAvailable, underlyingAsset],
  )

  const hasClaimBalance = useMemo(() => {
    if (!opportunityData?.rewardAssetIds?.length) return false

    return opportunityData.rewardAssetIds?.some((_rewardAssetId, i) =>
      bnOrZero(opportunityData?.rewardsAmountsCryptoBaseUnit?.[i]).gt(0),
    )
  }, [opportunityData?.rewardAssetIds, opportunityData?.rewardsAmountsCryptoBaseUnit])

  const menu: DefiButtonProps[] = useMemo(() => {
    if (!(contractAddress && yearnInvestor && opportunityData))
      return makeDefaultMenu(opportunityData?.expired, isCapUsed)
    if (!opportunityData?.rewardsAmountsCryptoBaseUnit?.length)
      return makeDefaultMenu(opportunityData.expired, isCapUsed)

    return [
      ...makeDefaultMenu(opportunityData?.expired, isCapUsed),
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
  }, [contractAddress, yearnInvestor, opportunityData, isCapUsed, hasClaimBalance, translate])

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
            <AlertTitle>{translate('defi.modals.saversVaults.haultedTitle')}</AlertTitle>
            <AlertDescription>
              {translate('defi.modals.saversVaults.haultedDescription')}
            </AlertDescription>
            <Button
              as={Link}
              href='https://twitter.com/thorchain'
              isExternal
              mt={4}
              colorScheme='twitter'
              rightIcon={<FaTwitter />}
            >
              @Thorchain
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
  }, [alertBg, capPercentaged, translate])

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
      provider='Yearn Finance'
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
