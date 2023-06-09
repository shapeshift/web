import { store } from 'state/store'

import { DEFI_PROVIDER_TO_METADATA } from '../constants'
import { selectGetReadOnlyOpportunities } from '../selectors/readonly'
import type { DefiProviderMetadata } from '../types'
import { DefiProvider } from '../types'

export const getMetadataForProvider = (provider: string): DefiProviderMetadata | undefined => {
  if (Object.values(DefiProvider).includes(provider as DefiProvider)) {
    return DEFI_PROVIDER_TO_METADATA[provider as DefiProvider]
  }

  const readOnlyOpportunities = selectGetReadOnlyOpportunities(store.getState())

  const readOnlyOpportunityMetadata = readOnlyOpportunities.data?.metadataByProvider?.[provider]

  return readOnlyOpportunityMetadata
}
