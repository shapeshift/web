import type { PayloadAction } from '@reduxjs/toolkit'
import { createAsyncThunk, createSlice, prepareAutoBatched } from '@reduxjs/toolkit'
import { createApi } from '@reduxjs/toolkit/dist/query/react'
import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import { isNft } from '@shapeshiftoss/caip'
import { PURGE } from 'redux-persist'
import type { PartialRecord } from 'lib/utils'
import { isRejected, isSome } from 'lib/utils'
import type { ReduxState } from 'state/reducer'
import type { AssetsState } from 'state/slices/assetsSlice/assetsSlice'
import { assets as assetsSlice, makeAsset } from 'state/slices/assetsSlice/assetsSlice'
import { portfolio } from 'state/slices/portfolioSlice/portfolioSlice'
import type { Portfolio, WalletId } from 'state/slices/portfolioSlice/portfolioSliceCommon'
import { selectPortfolioAssetIds } from 'state/slices/selectors'

import { BASE_RTK_CREATE_API_CONFIG } from '../const'
import { covalentApi } from '../covalent/covalentApi'
import { zapperApi } from '../zapper/zapperApi'
import type { NftCollectionType, NftItem, NftItemWithCollection } from './types'
import {
  getAlchemyCollectionData,
  getAlchemyNftData,
  getAlchemyNftsUserData,
  updateNftCollection,
  updateNftItem,
} from './utils'

type GetNftUserTokensInput = {
  accountIds: AccountId[]
}

type GetNftInput = {
  assetId: AssetId
}

type GetNftCollectionInput = {
  collectionId: AssetId
  // This looks weird but is correct. We abuse the Zapper balances endpoint to get collection meta
  accountIds: AccountId[]
}

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

type PortfolioAndAssetsUpsertPayload = {
  resultsData: NftItemWithCollection[]
  portfolioAssetIds: AssetId[]
}

const upsertPortfolioAndAssets = createAsyncThunk<void, PortfolioAndAssetsUpsertPayload>(
  'nft/upsertPortfolioAndAssets',
  ({ resultsData, portfolioAssetIds }, { dispatch }) => {
    const nftsById = resultsData.reduce<NftState['nfts']['byId']>((acc, item) => {
      if (!item.collection.assetId) return acc

      const nftAssetId: AssetId = `${item.collection.assetId}/${item.id}`
      let { collection, ...nftItemWithoutId } = item
      const nftItem: NftItem = {
        ...nftItemWithoutId,
        collectionId: item.collection.assetId,
      }
      acc[nftAssetId] = nftItem

      return acc
    }, {})

    const collectionsById = resultsData.reduce<NftState['collections']['byId']>((acc, item) => {
      if (!item.collection.assetId) return acc

      const collectionAssetId = item.collection.assetId
      if (!collectionAssetId) return acc

      acc[collectionAssetId] = item.collection

      return acc
    }, {})

    dispatch(
      nft.actions.upsertCollections({
        byId: collectionsById,
        ids: Object.keys(collectionsById),
      }),
    )
    dispatch(nft.actions.upsertNfts({ byId: nftsById, ids: Object.keys(nftsById) }))

    const portfolioNfts = portfolioAssetIds.filter(isNft) // Note: You will need to define `isNft` somewhere or replace this with the actual condition
    const missingPortfolioNfts = Object.values(nftsById).filter(
      nft => !portfolioNfts.includes(nft?.assetId ?? ''),
    )
    const assetsToUpsert = missingPortfolioNfts.reduce<AssetsState>(
      (acc, nft) => {
        if (!nft) return acc

        acc.byId[nft.assetId] = makeAsset({
          assetId: nft.assetId,
          id: nft.id,
          symbol: nft.symbol ?? 'N/A',
          name: nft.name,
          precision: 0,
          icon: nft.medias[0]?.originalUrl,
        })

        acc.ids.push(nft.assetId)

        return acc
      },
      { byId: {}, ids: [] },
    )

    const portfolioDataToUpsert: Portfolio = {
      accounts: {
        byId: {},
        ids: [],
      },
      accountBalances: {
        byId: {},
        ids: [],
      },
      accountMetadata: {
        byId: {},
        ids: [],
      },
      wallet: {
        byId: {},
        ids: [],
      },
    }

    missingPortfolioNfts.forEach(nft => {
      if (!nft) return

      const accountId = nft.ownerAccountId

      if (!accountId) return

      if (!portfolioDataToUpsert.accounts.byId[accountId]) {
        portfolioDataToUpsert.accounts.byId[accountId] = {
          assetIds: [nft.assetId],
        }
        portfolioDataToUpsert.accounts.ids.push(accountId)
      } else {
        portfolioDataToUpsert.accounts.byId[accountId].assetIds.push(nft.assetId)
      }

      const balanceData = {
        [nft.assetId]: '1',
      }
      if (!portfolioDataToUpsert.accountBalances.byId[accountId]) {
        portfolioDataToUpsert.accountBalances.byId[accountId] = balanceData
        portfolioDataToUpsert.accountBalances.ids.push(accountId)
      } else {
        portfolioDataToUpsert.accountBalances.byId[accountId] = Object.assign(
          portfolioDataToUpsert.accountBalances.byId[accountId],
          balanceData,
        )
      }
    })

    dispatch(assetsSlice.actions.upsertAssets(assetsToUpsert))
    dispatch(portfolio.actions.upsertPortfolio(portfolioDataToUpsert))
  },
)

export const nft = createSlice({
  name: 'nftData',
  initialState,
  reducers: {
    clear: () => initialState,
    upsertCollection: (state, action: PayloadAction<NftCollectionType>) => {
      const maybeCurrentCollectionItem = state.collections.byId[action.payload.assetId]
      const collectionItemToUpsert = maybeCurrentCollectionItem
        ? updateNftCollection(maybeCurrentCollectionItem, action.payload)
        : action.payload
      state.collections.byId = Object.assign({}, state.collections.byId, {
        [action.payload.assetId]: collectionItemToUpsert,
      })
      state.collections.ids = Array.from(
        new Set(state.collections.ids.concat([action.payload.assetId])),
      )
    },
    upsertCollections: (state, action: PayloadAction<NftState['collections']>) => {
      state.collections.byId = Object.assign({}, state.collections.byId, action.payload.byId)
      state.collections.ids = Array.from(new Set(state.collections.ids.concat(action.payload.ids)))
    },
    upsertNft: (state, action: PayloadAction<NftItem>) => {
      state.nfts.byId = Object.assign({}, state.nfts.byId, {
        [action.payload.assetId]: action.payload,
      })
      state.nfts.ids = Array.from(new Set(state.nfts.ids.concat(action.payload.assetId)))
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
      queryFn: async ({ accountIds }, { dispatch, getState }) => {
        const state = getState() as ReduxState
        const portfolioAssetIds = selectPortfolioAssetIds(state)
        const services = [
          getAlchemyNftsUserData,
          (accountIds: AccountId[]) =>
            dispatch(
              zapperApi.endpoints.getZapperNftUserTokens.initiate(
                { accountIds },
                { forceRefetch: true },
              ),
            ),
          (accountIds: AccountId[]) =>
            dispatch(
              covalentApi.endpoints.getCovalentNftUserTokens.initiate(
                { accountIds },
                { forceRefetch: true },
              ),
            ),
        ]

        const results = await Promise.allSettled(services.map(service => service(accountIds)))

        const resultsDataById = results.reduce<Record<AssetId, NftItemWithCollection>>(
          (acc, result) => {
            if (isRejected(result)) return acc

            if (result.value.data) {
              const { data } = result.value

              data.forEach(item => {
                const { assetId } = item

                if (!acc[assetId]) {
                  acc[assetId] = item
                } else {
                  acc[assetId] = updateNftItem(acc[assetId], item)
                }
              })
              // An actual RTK error, different from a rejected promise i.e getAlchemyNftData rejecting
            } else if (result.value.isError) {
              console.error(result.value.error)
            }

            return acc
          },
          {},
        )

        const resultsData = Object.values(resultsDataById)

        const nftsById = resultsData.reduce<NftState['nfts']['byId']>((acc, item) => {
          if (!item.collection.assetId) return acc

          const nftAssetId: AssetId = `${item.collection.assetId}/${item.id}`
          let { collection, ...nftItemWithoutId } = item
          const nftItem: NftItem = {
            ...nftItemWithoutId,
            collectionId: item.collection.assetId,
          }
          acc[nftAssetId] = nftItem

          return acc
        }, {})

        const data = Object.values(nftsById).filter(isSome)
        dispatch(upsertPortfolioAndAssets({ resultsData, portfolioAssetIds }))
        return { data }
      },
    }),
    getNft: build.query<NftItemWithCollection, GetNftInput>({
      queryFn: async ({ assetId }, { dispatch }) => {
        try {
          const { data: nftDataWithCollection } = await getAlchemyNftData(assetId)

          const { collection, ...nftItemWithoutId } = nftDataWithCollection
          const nftItem: NftItem = {
            ...nftItemWithoutId,
            collectionId: nftDataWithCollection.collection.assetId,
          }

          dispatch(nft.actions.upsertNft(nftItem))

          return { data: nftDataWithCollection }
        } catch (error) {
          return {
            error: {
              status: 500,
              data: {
                message: 'Failed to fetch nft data',
              },
            },
          }
        }
      },
    }),

    getNftCollection: build.query<NftCollectionType, GetNftCollectionInput>({
      queryFn: async ({ collectionId, accountIds }, { dispatch }) => {
        try {
          const services = [
            getAlchemyCollectionData,
            (collectionId: AssetId, accountIds: AccountId[]) =>
              dispatch(
                zapperApi.endpoints.getZapperCollectionBalance.initiate({
                  accountIds,
                  collectionId,
                }),
              ),
          ]

          const results = await Promise.allSettled(
            services.map(service => service(collectionId, accountIds)),
          )

          const collectionData = results.reduce<NftCollectionType | null>((acc, result) => {
            if (isRejected(result)) return acc

            const { data } = result.value

            if (!data) return acc
            if (!acc) return data

            return updateNftCollection(acc, data)
          }, null)

          if (!collectionData) {
            throw new Error('Failed to fetch nft collection data')
          }

          dispatch(nft.actions.upsertCollection(collectionData))
          return { data: collectionData }
        } catch (error) {
          console.error(error)
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

export const { useGetNftCollectionQuery } = nftApi
