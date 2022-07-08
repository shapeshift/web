import { ArrowDownIcon, ArrowUpIcon } from '@chakra-ui/icons'
import { Center, useToast } from '@chakra-ui/react'
import { toAssetId } from '@shapeshiftoss/caip'
import { YearnOpportunity } from '@shapeshiftoss/investor-yearn'
import { Overview } from 'features/defi/components/Overview/Overview'
import {
  DefiAction,
  DefiParams,
  DefiQueryParams,
} from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { useYearn } from 'features/defi/contexts/YearnProvider/YearnProvider'
import { useEffect, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { CircularProgress } from 'components/CircularProgress/CircularProgress'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { useGetAssetDescriptionQuery } from 'state/slices/assetsSlice/assetsSlice'
import {
  selectAssetById,
  selectMarketDataById,
  selectPortfolioCryptoBalanceByAssetId,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

export const YearnOverview = () => {
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
  const balance = useAppSelector(state =>
    selectPortfolioCryptoBalanceByAssetId(state, { assetId: vaultTokenId }),
  )

  const cryptoAmountAvailable = bnOrZero(balance).div(`1e${asset.precision}`)
  const fiatAmountAvailable = bnOrZero(cryptoAmountAvailable).times(marketData.price)

  const descriptionQuery = useGetAssetDescriptionQuery(assetId)

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
        console.error('YearnDeposit error:', error)
      }
    })()
  }, [api, vaultAddress, chainId, toast, translate])

  if (!opportunity) {
    return (
      <Center minW='500px' minH='350px'>
        <CircularProgress />
      </Center>
    )
  }

  return (
    <Overview
      asset={asset}
      name={`${underlyingToken.name} Vault (${opportunity.version})`}
      balance={fiatAmountAvailable.toFixed(2)}
      underlyingAssets={[
        {
          ...underlyingToken,
          balance: cryptoAmountAvailable.toPrecision(),
          allocationPercentage: '1',
        },
      ]}
      provider='Yearn Finance'
      description={{
        description: underlyingToken.description,
        isLoaded: !descriptionQuery.isLoading,
        isTrustedDescription: underlyingToken.isTrustedDescription,
      }}
      tvl={opportunity.tvl.balanceUsdc.toFixed(2)}
      apy={opportunity.apy.toString()}
      menu={[
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
      ]}
    />
  )
}
