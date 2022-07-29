import { useEffect, useState } from 'react'
import { ClaimConfirm } from './ClaimConfirm'
import { toAssetId } from '@shapeshiftoss/caip'
import { AnimatePresence } from 'framer-motion'
import { Route, Switch, useLocation } from 'react-router'
import { SlideTransition } from 'components/SlideTransition'
import { RouteSteps } from 'components/RouteSteps/RouteSteps'
import { ClaimableToken } from '@shapeshiftoss/investor-idle'
import { useWalletAddress } from 'pages/Defi/hooks/useWalletAddress'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'
import { useIdle } from 'features/defi/contexts/IdleProvider/IdleProvider'
// import { useVaultBalances } from 'pages/Defi/hooks/useVaultBalances'
import { DefiParams, DefiQueryParams } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'

type ClaimRouteProps = {
  onBack: () => void
}

export const ClaimRoutes = ({ onBack }: ClaimRouteProps) => {
  const { query } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const { contractAddress, assetReference, chainId } = query
  const [ claimableTokens, setClaimableTokens ] = useState<ClaimableToken[]>([])

  const assetNamespace = 'erc20'
  const stakingAssetId = toAssetId({
    chainId,
    assetNamespace,
    assetReference,
  })
  const vaultAssetId = toAssetId({
    chainId,
    assetNamespace,
    assetReference:contractAddress
  })
  const walletAddress = useWalletAddress();
  const { idle: idleInvestor } = useIdle()
  // const opportunities = useVaultBalances()
  // const opportunity = opportunities.vaults[contractAddress]

  useEffect(() => {
    ;(async () => {
      if (!walletAddress || !idleInvestor) {
        return
      }
      const idleOpportunity = await idleInvestor.findByOpportunityId(vaultAssetId)
      if (idleOpportunity){
        const claimableTokens = await idleOpportunity.getClaimableTokens(walletAddress)
        setClaimableTokens(claimableTokens)
      }
    })()
  }, [walletAddress])

  console.log(claimableTokens)

  return (
    <ClaimConfirm
      onBack={onBack}
      chainId={chainId}
      assetId={stakingAssetId}
      claimableTokens={claimableTokens}
      contractAddress={contractAddress}
    />
  )
}
