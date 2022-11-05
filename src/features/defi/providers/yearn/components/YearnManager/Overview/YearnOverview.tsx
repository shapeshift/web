import { ArrowDownIcon, ArrowUpIcon } from '@chakra-ui/icons'
import { Center, useToast } from '@chakra-ui/react'
import type { AccountId } from '@keepkey/caip'
import { toAssetId } from '@keepkey/caip'
import type { YearnOpportunity } from '@keepkey/investor-yearn'
import { USDC_PRECISION } from 'constants/UsdcPrecision'
import { Overview } from 'features/defi/components/Overview/Overview'
import type {
  DefiParams,
  DefiQueryParams,
} from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { DefiAction } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { useYearn } from 'features/defi/contexts/YearnProvider/YearnProvider'
import { useEffect, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import type { AccountDropdownProps } from 'components/AccountDropdown/AccountDropdown'
import { CircularProgress } from 'components/CircularProgress/CircularProgress'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { logger } from 'lib/logger'
import { useGetAssetDescriptionQuery } from 'state/slices/assetsSlice/assetsSlice'
import {
  selectAssetById,
  selectMarketDataById,
  selectPortfolioCryptoBalanceByFilter,
  selectSelectedLocale,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'
import type { Nullable } from 'types/common'

const moduleLogger = logger.child({
  namespace: ['DeFi', 'Providers', 'Yearn', 'YearnOverview'],
})

export const YearnOverview: React.FC<{
  accountId?: Nullable<AccountId>
  onAccountIdChange: AccountDropdownProps['onChange']
}> = ({ accountId, onAccountIdChange: handleAccountIdChange }) => {
  const { yearn: api } = useYearn()
  const translate = useTranslate()
  const toast = useToast()
  const { query } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const [opportunity, setOpportunity] = useState<YearnOpportunity | null>(null)
  const { chainId, contractAddress: vaultAddress, assetReference } = query

  const assetNamespace = 'erc20'
  const assetId = toAssetId({ chainId, assetNamespace, assetReference })
  const vaultTokenId = toAssetId({
    chainId,
    assetNamespace,
    assetReference: vaultAddress,
  })
  const asset = useAppSelector(state => selectAssetById(state, vaultTokenId))
  const underlyingToken = useAppSelector(state => selectAssetById(state, assetId))
  const marketData = useAppSelector(state => selectMarketDataById(state, assetId))
  // user info
  const filter = useMemo(
    () => ({ assetId: vaultTokenId, accountId: accountId ?? '' }),
    [vaultTokenId, accountId],
  )
  const balance = useAppSelector(state => selectPortfolioCryptoBalanceByFilter(state, filter))

  const cryptoAmountAvailable = bnOrZero(balance).div(`1e${asset.precision}`)
  const fiatAmountAvailable = bnOrZero(cryptoAmountAvailable).times(marketData.price)

  const selectedLocale = useAppSelector(selectSelectedLocale)
  const descriptionQuery = useGetAssetDescriptionQuery({ assetId, selectedLocale })

  useEffect(() => {
    ;(async () => {
      try {
        if (!(vaultAddress && api)) return
        const [opportunity] = await Promise.all([
          api.findByOpportunityId(
            toAssetId({ chainId, assetNamespace, assetReference: vaultAddress }),
          ),
        ])
        if (!opportunity) {
          return toast({
            position: 'top-right',
            description: translate('common.somethingWentWrongBody'),
            title: translate('common.somethingWentWrong'),
            status: 'error',
          })
        }
        setOpportunity(opportunity)
      } catch (error) {
        // TODO: handle client side errors
        moduleLogger.error(error, 'YearnDeposit error')
      }
    })()
  }, [api, vaultAddress, chainId, toast, translate])

  const underlyingAssets = useMemo(
    () => [
      {
        ...underlyingToken,
        cryptoBalance: cryptoAmountAvailable.toPrecision(),
        allocationPercentage: '1',
      },
    ],
    [cryptoAmountAvailable, underlyingToken],
  )

  const description = useMemo(
    () => ({
      description: underlyingToken.description,
      isLoaded: !descriptionQuery.isLoading,
      isTrustedDescription: underlyingToken.isTrustedDescription,
    }),
    [descriptionQuery.isLoading, underlyingToken.description, underlyingToken.isTrustedDescription],
  )

  const menu = useMemo(
    () => [
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
    ],
    [],
  )

  if (!opportunity) {
    return (
      <Center minW='500px' minH='350px'>
        <CircularProgress />
      </Center>
    )
  }

  return (
    <Overview
      accountId={accountId}
      onAccountIdChange={handleAccountIdChange}
      asset={asset}
      name={`${underlyingToken.name} Vault (${opportunity.version})`}
      opportunityFiatBalance={fiatAmountAvailable.toFixed(2)}
      underlyingAssets={underlyingAssets}
      provider='Yearn Finance'
      description={description}
      tvl={opportunity.tvl.balanceUsdc.div(`1e+${USDC_PRECISION}`).toString()}
      apy={opportunity.apy.toString()}
      menu={menu}
    />
  )
}
