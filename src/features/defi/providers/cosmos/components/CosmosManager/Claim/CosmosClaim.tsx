import { toAssetId } from '@shapeshiftoss/caip'
import { DefiModalContent } from 'features/defi/components/DefiModal/DefiModalContent'
import { DefiModalHeader } from 'features/defi/components/DefiModal/DefiModalHeader'
import {
  DefiAction,
  DefiParams,
  DefiQueryParams,
} from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import qs from 'qs'
import { useTranslate } from 'react-polyglot'
import { MemoryRouter } from 'react-router'
import { SlideTransition } from 'components/SlideTransition'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'
import { selectAssetById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { ClaimRoutes } from './ClaimRoutes'

export const CosmosClaim = () => {
  const { query, history, location } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const { chainId, assetReference } = query

  const assetNamespace = 'slip44' // TODO: add to query, why do we hardcode this?
  // Asset info
  const assetId = toAssetId({
    chainId,
    assetNamespace,
    assetReference, // TODO: handle multiple denoms
  })
  const asset = useAppSelector(state => selectAssetById(state, assetId))

  const translate = useTranslate()

  const handleBack = () => {
    history.push({
      pathname: location.pathname,
      search: qs.stringify({
        ...query,
        modal: DefiAction.Overview,
      }),
    })
  }

  return (
    <DefiModalContent>
      <DefiModalHeader
        onBack={handleBack}
        title={translate('defi.modals.claim.claimYour', {
          opportunity: `${asset.name}`,
        })}
      />
      <SlideTransition>
        <MemoryRouter>
          <ClaimRoutes onBack={handleBack} />
        </MemoryRouter>
      </SlideTransition>
    </DefiModalContent>
  )
}
