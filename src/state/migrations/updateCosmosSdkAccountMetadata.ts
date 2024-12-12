import { cosmosChainId, fromAccountId, thorchainChainId } from '@shapeshiftoss/caip'
import type { Portfolio } from 'state/slices/portfolioSlice/portfolioSliceCommon'

export const updateCosmosSdkAccountMetadata = (state: Portfolio): Portfolio => {
  const newState = {
    ...state,
    accountMetadata: {
      ...state.accountMetadata,
      byId: Object.entries(state.accountMetadata.byId).reduce((acc, [accountId, metadata]) => {
        const { chainId } = fromAccountId(accountId)

        // Explicit isChange: false and addressIndex: 0 for Cosmos SDK accounts metadata
        if (chainId === cosmosChainId || chainId === thorchainChainId) {
          return {
            ...acc,
            [accountId]: {
              ...metadata,
              bip44Params: {
                ...metadata.bip44Params,
                isChange: false,
                addressIndex: 0,
              },
            },
          }
        }

        return {
          ...acc,
          [accountId]: metadata,
        }
      }, {}),
    },
  }

  return newState
}
