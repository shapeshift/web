import qs from 'qs'
import { useMemo } from 'react'
import { MemoryRouter } from 'react-router'
import { ClaimRoutes } from './ClaimRoutes'
import { ClaimStatus } from './ClaimStatus'
import { useAppSelector } from 'state/store'
import { useTranslate } from 'react-polyglot'
import { ClaimConfirm } from './ClaimConfirm'
import { toAssetId } from '@shapeshiftoss/caip'
import { selectAssetById } from 'state/slices/selectors'
import { SlideTransition } from 'components/SlideTransition'
import { DefiStepProps, Steps } from 'components/DeFi/components/Steps'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'
import { DefiModalHeader } from 'features/defi/components/DefiModal/DefiModalHeader'
import { DefiModalContent } from 'features/defi/components/DefiModal/DefiModalContent'
import { DefiAction, DefiParams, DefiQueryParams, DefiStep } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'

export const Claim = () => {
  const translate = useTranslate()
  const { query, history, location } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const { chainId, assetReference } = query

  const handleBack = () => {
    history.push({
      pathname: location.pathname,
      search: qs.stringify({
        ...query,
        modal: DefiAction.Overview,
      }),
    })
  }

  const assetNamespace = 'erc20'
  const underlyingAssetId = toAssetId({
    chainId,
    assetNamespace,
    assetReference,
  })
  const underlyingAsset = useAppSelector(state => selectAssetById(state, underlyingAssetId))

  const StepConfig: DefiStepProps = useMemo(() => {
    return {
      [DefiStep.Info]: {
        label: translate('defi.steps.claim.info.title'),
        description: translate('defi.steps.claim.info.description', {
          asset: underlyingAsset.symbol,
        }),
        component: ClaimRoutes,
      },
      [DefiStep.Status]: {
        label: 'Status',
        component: ClaimStatus,
      },
    }
    // We only need this to update on symbol change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [underlyingAsset.symbol])

  return (
    <DefiModalContent>
      <DefiModalHeader
        title={translate('defi.modals.claim.claimingRewards', {
          opportunity: `${underlyingAsset.symbol} Vault`,
        })}
        onBack={handleBack}
      />
      <Steps steps={StepConfig} />
    </DefiModalContent>
  )
}
