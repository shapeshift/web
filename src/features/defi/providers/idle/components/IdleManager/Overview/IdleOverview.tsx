import { ArrowDownIcon, ArrowUpIcon } from '@chakra-ui/icons'
import { Center, useToast } from '@chakra-ui/react'
import { toAssetId } from '@keepkey/caip'
import type { ClaimableToken, IdleOpportunity } from '@keepkey/investor-idle'
import { KnownChainIds } from '@keepkey/types'
import { USDC_PRECISION } from 'constants/UsdcPrecision'
import type { DefiButtonProps } from 'features/defi/components/DefiActionButtons'
import type { AssetWithBalance } from 'features/defi/components/Overview/Overview'
import { Overview } from 'features/defi/components/Overview/Overview'
import type {
  DefiParams,
  DefiQueryParams,
} from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { DefiAction } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { useIdle } from 'features/defi/contexts/IdleProvider/IdleProvider'
import { useEffect, useMemo, useState } from 'react'
import { FaGift } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'
import { CircularProgress } from 'components/CircularProgress/CircularProgress'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'
import { useWallet } from 'hooks/useWallet/useWallet'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { logger } from 'lib/logger'
import { useGetAssetDescriptionQuery } from 'state/slices/assetsSlice/assetsSlice'
import {
  selectAssetById,
  selectMarketDataById,
  selectPortfolioCryptoBalanceByAssetId,
  selectSelectedLocale,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

const moduleLogger = logger.child({
  namespace: ['Defi', 'Providers', 'Idle', 'IdleManager', 'Overview', 'IdleOverview'],
})

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

export const IdleOverview = () => {
  const { idleInvestor } = useIdle()
  const translate = useTranslate()
  const toast = useToast()
  const [menu, setMenu] = useState<DefiButtonProps[]>(defaultMenu)
  const { query } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const [opportunity, setOpportunity] = useState<IdleOpportunity | null>(null)
  const [claimableTokens, setClaimableTokens] = useState<ClaimableToken[]>([])
  const { chainId, contractAddress: vaultAddress, assetReference } = query
  const [walletAddress, setWalletAddress] = useState<string>(
    '0x0000000000000000000000000000000000000000',
  )

  const assetNamespace = 'erc20'
  const assetId = toAssetId({ chainId, assetNamespace, assetReference })
  const vaultTokenId = toAssetId({
    chainId,
    assetNamespace,
    assetReference: vaultAddress,
  })
  const asset = useAppSelector(state => selectAssetById(state, assetId))
  const vault = useAppSelector(state => selectAssetById(state, vaultTokenId))
  const underlyingToken = useAppSelector(state => selectAssetById(state, assetId))
  const marketData = useAppSelector(state => selectMarketDataById(state, assetId))
  // user info
  const balance = useAppSelector(state =>
    selectPortfolioCryptoBalanceByAssetId(state, { assetId: vaultTokenId }),
  )

  const cryptoAmountAvailable = bnOrZero(balance).div(`1e${vault.precision}`)
  const fiatAmountAvailable = bnOrZero(cryptoAmountAvailable).times(marketData.price)

  const selectedLocale = useAppSelector(selectSelectedLocale)
  const descriptionQuery = useGetAssetDescriptionQuery({ assetId, selectedLocale })

  const chainAdapterManager = getChainAdapterManager()
  const chainAdapter = chainAdapterManager.get(KnownChainIds.EthereumMainnet)
  const { state: walletState } = useWallet()
  const bip44Params = chainAdapter?.getBIP44Params({ accountNumber: 0 })

  useEffect(() => {
    ;(async () => {
      if (!(walletState.wallet && chainAdapter && bip44Params)) return
      const walletAddress = await chainAdapter.getAddress({
        wallet: walletState.wallet,
        bip44Params,
      })
      setWalletAddress(walletAddress)
    })()
  }, [chainAdapter, walletState, bip44Params])

  useEffect(() => {
    if (!(vaultAddress && idleInvestor)) return
    ;(async () => {
      try {
        const opportunity = await idleInvestor.findByOpportunityId(
          toAssetId({ chainId, assetNamespace, assetReference: vaultAddress }),
        )

        if (!opportunity) {
          return toast({
            position: 'top-right',
            description: translate('common.somethingWentWrongBody'),
            title: translate('common.somethingWentWrong'),
            status: 'error',
          })
        }
        setOpportunity(opportunity)

        const claimableTokens = await opportunity.getClaimableTokens(walletAddress)
        setClaimableTokens(claimableTokens)

        if (!opportunity.metadata.cdoAddress) {
          const totalClaimableRewards = claimableTokens.reduce((totalRewards, token) => {
            totalRewards = totalRewards.plus(token.amount)
            return totalRewards
          }, bnOrZero(0))

          const claimDisabled = !totalClaimableRewards || totalClaimableRewards.lte(0)

          setMenu([
            ...defaultMenu,
            {
              icon: <FaGift />,
              colorScheme: 'green',
              label: 'common.claim',
              variant: 'ghost-filled',
              action: DefiAction.Claim,
              isDisabled: claimDisabled,
              toolTip: translate('defi.modals.overview.noWithdrawals'),
            },
          ])
        }
      } catch (error) {
        // TODO: handle client side errors
        moduleLogger.error(error, 'IdleOverview:useEffect error')
      }
    })()
  }, [idleInvestor, vaultAddress, chainId, toast, translate, walletAddress])

  const assets = useAppSelector(selectorState => selectorState.assets.byId)

  const rewardAssets = useMemo((): AssetWithBalance[] => {
    if (!claimableTokens || !claimableTokens.length) return []
    return claimableTokens.reduce((rewardAssets: AssetWithBalance[], token) => {
      const rewardAsset = assets[token.assetId]
      if (rewardAsset) {
        rewardAssets.push({
          ...rewardAsset,
          cryptoBalance: bnOrZero(token.amount).div(`1e+${rewardAsset.precision}`).toPrecision(),
        })
      }
      return rewardAssets
    }, [])
  }, [assets, claimableTokens])

  const underlyingAssets = useMemo(
    () => [
      {
        ...underlyingToken,
        cryptoBalance: cryptoAmountAvailable.toPrecision(),
        allocationPercentage: '1',
      },
    ],
    [underlyingToken, cryptoAmountAvailable],
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
      asset={asset}
      name={`${underlyingToken.name} Vault (${opportunity.version})`}
      opportunityFiatBalance={fiatAmountAvailable.toFixed(2)}
      underlyingAssets={underlyingAssets}
      provider='Idle Finance'
      description={{
        description: underlyingToken.description,
        isLoaded: !descriptionQuery.isLoading,
        isTrustedDescription: underlyingToken.isTrustedDescription,
      }}
      tvl={opportunity.tvl.balanceUsdc.div(`1e+${USDC_PRECISION}`).toFixed(2)}
      apy={opportunity.apy.toString()}
      menu={menu}
      {...(rewardAssets.length && { rewardAssets })}
    />
  )
}
