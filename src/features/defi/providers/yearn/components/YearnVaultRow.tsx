import { caip19 } from '@shapeshiftoss/caip'
import { bnOrZero } from '@shapeshiftoss/chain-adapters'
import { YearnVault } from '@shapeshiftoss/investor-yearn'
import { ContractTypes, NetworkTypes } from '@shapeshiftoss/types'
import BigNumber from 'bignumber.js'
import { useYearn } from 'features/defi/contexts/YearnProvider/YearnProvider'
import { EarnOpportunityType } from 'features/defi/helpers/normalizeOpportunity'
import qs from 'qs'
import { useEffect, useState } from 'react'
import { useHistory, useLocation } from 'react-router'
import { EarnOpportunityRow } from 'components/StakingVaults/EarnOpportunityRow'
import { useChainAdapters } from 'context/ChainAdaptersProvider/ChainAdaptersProvider'
import { useWallet, WalletActions } from 'context/WalletProvider/WalletProvider'
import { selectAssetByCAIP19, selectMarketDataById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

type YearnVaultProps = {
  isLoaded?: boolean
  index: number
  showTeaser?: boolean
} & EarnOpportunityType

export const YearnVaultRow = (opportunity: YearnVaultProps) => {
  const { type, provider, contractAddress, chain, tokenAddress } = opportunity
  const [vault, setVault] = useState<YearnVault | null>(null)
  const [cryptoAmount, setCryptoAmount] = useState<BigNumber>(bnOrZero(0))
  const [fiatAmount, setFiatAmount] = useState<BigNumber>(bnOrZero(0))
  const { yearn, loading } = useYearn()
  const history = useHistory()
  const location = useLocation()

  const network = NetworkTypes.MAINNET
  const contractType = ContractTypes.ERC20
  // asset
  const assetCAIP19 = caip19.toCAIP19({ chain, network, contractType, tokenId: tokenAddress })
  const asset = useAppSelector(state => selectAssetByCAIP19(state, assetCAIP19))
  const marketData = useAppSelector(state => selectMarketDataById(state, assetCAIP19))

  // account info
  const chainAdapterManager = useChainAdapters()
  const chainAdapter = chainAdapterManager.byChain(chain)
  const {
    state: { isConnected, wallet },
    dispatch
  } = useWallet()

  const handleClick = () => {
    if (isConnected) {
      history.push({
        pathname: `/defi/${type}/${provider}/deposit`,
        search: qs.stringify({
          chain,
          contractAddress,
          tokenId: tokenAddress
        }),
        state: { background: location }
      })
    } else {
      dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: true })
    }
  }

  useEffect(() => {
    ;(async () => {
      if (!yearn || !wallet || loading) return null
      try {
        const _vault = yearn.findByVaultTokenId(contractAddress)
        if (_vault) setVault(_vault)
        const userAddress = await chainAdapter.getAddress({ wallet })
        // TODO: currently this is hard coded to yearn vaults only.
        // In the future we should add a hook to get the provider interface by vault provider
        const [balance, pricePerShare] = await Promise.all([
          yearn.balance({ vaultAddress: contractAddress, userAddress }),
          yearn.pricePerShare({ vaultAddress: contractAddress })
        ])
        const amount = bnOrZero(balance).div(`1e+${vault?.decimals}`)
        const price = pricePerShare.div(`1e+${vault?.decimals}`).times(marketData?.price)
        setCryptoAmount(amount)
        setFiatAmount(amount.times(price))
      } catch (error) {
        console.error('StakingVaultRow useEffect', error)
      }
    })()
  }, [chainAdapter, contractAddress, loading, marketData?.price, vault?.decimals, wallet, yearn])

  const hasZeroBalanceAndApy =
    bnOrZero(vault?.metadata?.apy?.net_apy).isEqualTo(0) && bnOrZero(cryptoAmount).isEqualTo(0)

  if (!asset || !vault || hasZeroBalanceAndApy || !yearn || loading) {
    console.info('remove vault', asset, vault, hasZeroBalanceAndApy, yearn, loading)
    return null
  }

  return (
    <EarnOpportunityRow
      {...opportunity}
      assetId={asset.caip19}
      onClick={handleClick}
      fiatAmount={fiatAmount.toString()}
      cryptoAmount={cryptoAmount.toString()}
    />
  )
}
