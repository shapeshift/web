import type { PayloadAction } from '@reduxjs/toolkit'
import { createSlice, prepareAutoBatched } from '@reduxjs/toolkit'
import { createApi } from '@reduxjs/toolkit/dist/query/react'
import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import { fromAssetId } from '@shapeshiftoss/caip'
import { PURGE } from 'redux-persist'
import { getAlchemyInstanceByChainId } from 'lib/alchemySdkInstance'
import { logger } from 'lib/logger'
import type { PartialRecord } from 'lib/utils'
import type { WalletId } from 'state/slices/portfolioSlice/portfolioSliceCommon'

import { BASE_RTK_CREATE_API_CONFIG } from '../const'
import { covalentApi } from '../covalent/covalentApi'
import { zapperApi } from '../zapper/zapperApi'
import { parseAlchemyNftContractToCollectionItem } from './parsers/alchemy'
import type { NftCollectionType, NftItem } from './types'
import { getAlchemyNftData, updateNftItem } from './utils'

type GetNftUserTokensInput = {
  accountIds: AccountId[]
}

type GetNftCollectionInput = {
  collectionId: AssetId
  // This looks weird but is correct. We abuse the Zapper balances endpoint to get collection meta
  accountIds: AccountId[]
}

const moduleLogger = logger.child({ namespace: ['nftApi'] })

type NftState = {
  selectedNftAvatarByWalletId: Record<WalletId, AssetId>
  nfts: {
    byId: PartialRecord<AssetId, NftItem>
    ids: AssetId[]
  }
  collections: {
    byId: PartialRecord<AssetId, NftCollectionType>
    ids: AssetId[]
  }
}

export const initialState: NftState = {
  selectedNftAvatarByWalletId: {},
  nfts: {
    byId: {},
    ids: [],
  },
  collections: {
    byId: {},
    ids: [],
  },
}

export const nft = createSlice({
  name: 'nftData',
  initialState,
  reducers: {
    clear: () => initialState,
    upsertCollections: (state, action: PayloadAction<NftState['collections']>) => {
      state.collections.byId = Object.assign({}, state.collections.byId, action.payload.byId)
      state.collections.ids = Array.from(new Set(state.collections.ids.concat(action.payload.ids)))
    },
    upsertNfts: (state, action: PayloadAction<NftState['nfts']>) => {
      state.nfts.byId = Object.assign({}, state.nfts.byId, action.payload.byId)
      state.nfts.ids = Array.from(new Set(state.nfts.ids.concat(action.payload.ids)))
    },
    setWalletSelectedNftAvatar: {
      reducer: (
        draftState,
        { payload }: { payload: { nftAssetId: AssetId; walletId: WalletId } },
      ) => {
        draftState.selectedNftAvatarByWalletId[payload.walletId] = payload.nftAssetId
      },
      // Use the `prepareAutoBatched` utility to automatically
      // add the `action.meta[SHOULD_AUTOBATCH]` field the enhancer needs
      prepare: prepareAutoBatched<{ nftAssetId: AssetId; walletId: WalletId }>(),
    },
  },
  extraReducers: builder => builder.addCase(PURGE, () => initialState),
})

export const nftApi = createApi({
  ...BASE_RTK_CREATE_API_CONFIG,
  reducerPath: 'nftApi',
  endpoints: build => ({
    getNftUserTokens: build.query<NftItem[], GetNftUserTokensInput>({
      queryFn: async ({ accountIds }, { dispatch }) => {
        const services = [
          getAlchemyNftData,
          (accountIds: AccountId[]) =>
            dispatch(zapperApi.endpoints.getZapperNftUserTokens.initiate({ accountIds })),
          (accountIds: AccountId[]) =>
            dispatch(covalentApi.endpoints.getCovalentNftUserTokens.initiate({ accountIds })),
        ]

        const results = await Promise.all(services.map(service => service(accountIds)))

        const nftsById = results.reduce<Record<AssetId, NftItem>>((acc, result) => {
          if (result.data) {
            const { data } = result

            data.forEach(item => {
              const { assetId } = item

              if (!acc[assetId]) {
                acc[assetId] = item
              } else {
                acc[assetId] = updateNftItem(acc[assetId], item)
              }
            })
          } else if (result.isError) {
            moduleLogger.error({ error: result.error }, 'Failed to fetch nft user data')
          }

          return acc
        }, {})

        const nftIds: AssetId[] = Object.keys(nftsById)

        const data = Object.values(nftsById)
        const collectionsById = data.reduce<NftState['collections']['byId']>((acc, item) => {
          const collectionAssetId = item.collection.assetId
          if (!collectionAssetId) return acc

          acc[collectionAssetId] = item.collection

          return acc
        }, {})
        const collectionIds: AssetId[] = Object.keys(collectionsById)

        dispatch(nft.actions.upsertCollections({ byId: collectionsById, ids: collectionIds }))
        dispatch(nft.actions.upsertNfts({ byId: nftsById, ids: nftIds }))

        return { data }
      },
    }),
    getNftCollection: build.query<NftCollectionType, GetNftCollectionInput>({
      queryFn: async ({ collectionId, accountIds }, { dispatch }) => {
        try {
          const { assetReference: collectionAddress, chainId } = fromAssetId(collectionId)
          const alchemyCollectionData = await getAlchemyInstanceByChainId(chainId)
            .nft.getContractMetadata(collectionAddress)
            .then(contract => parseAlchemyNftContractToCollectionItem(contract, chainId))

          // Alchemy is the most/only reliable source for collection data for now
          if (alchemyCollectionData) {
            return { data: alchemyCollectionData }
          }

          // Note, this will consistently fail, as getZapperCollectionBalance is monkey patched for the RTK query to reject
          // The reason for that is Zapper is currently rugged upstream - if we don't get Alchemy data, we're out of luck and can't get meta
          const { data: zapperCollectionData } = await dispatch(
            zapperApi.endpoints.getZapperCollectionBalance.initiate({ accountIds, collectionId }),
          )

          if (!zapperCollectionData)
            return {
              error: {
                status: 404,
                data: {
                  message: 'Collection not found',
                },
              },
            }

          return { data: zapperCollectionData }
        } catch (error) {
          moduleLogger.error({ error }, 'Failed to fetch nft collection data')
          return {
            error: {
              status: 500,
              data: {
                message: 'Failed to fetch nft collection data',
              },
            },
          }
        }
      },
    }),
  }),
})

export const { useGetNftUserTokensQuery, useGetNftCollectionQuery } = nftApi
