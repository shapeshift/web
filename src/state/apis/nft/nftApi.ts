import type { PayloadAction } from '@reduxjs/toolkit'
import { createAsyncThunk, createSlice, prepareAutoBatched } from '@reduxjs/toolkit'
import { createApi } from '@reduxjs/toolkit/dist/query/react'
import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import { deserializeNftAssetReference, fromAssetId } from '@shapeshiftoss/caip'
import type { PartialRecord } from '@shapeshiftoss/types'
import { makeAsset } from '@shapeshiftoss/utils'
import cloneDeep from 'lodash/cloneDeep'
import { PURGE } from 'redux-persist'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { isRejected } from 'lib/utils'
import type { UpsertAssetsPayload } from 'state/slices/assetsSlice/assetsSlice'
import { assets as assetsSlice } from 'state/slices/assetsSlice/assetsSlice'
import { selectAssets } from 'state/slices/assetsSlice/selectors'
import { portfolio as portfolioSlice } from 'state/slices/portfolioSlice/portfolioSlice'
import type { Portfolio, WalletId } from 'state/slices/portfolioSlice/portfolioSliceCommon'
import { initialState as initialPortfolioState } from 'state/slices/portfolioSlice/portfolioSliceCommon'

import { BASE_RTK_CREATE_API_CONFIG } from '../const'
import { covalentApi } from '../covalent/covalentApi'
import { zapperApi } from '../zapper/zapperApi'
import { BLACKLISTED_COLLECTION_IDS, hasSpammyMedias, isSpammyNftText } from './constants'
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
    byId: {
      ...BLACKLISTED_COLLECTION_IDS.reduce<Partial<Record<AssetId, NftCollectionType>>>(
        (acc, assetId) => ({ ...acc, [assetId]: { assetId, isSpam: true } }),
        {},
      ),
    },
    ids: BLACKLISTED_COLLECTION_IDS,
  },
}

type PortfolioAndAssetsUpsertPayload = {
  nftsById: Record<AssetId, NftItem>
}

const upsertPortfolioAndAssets = createAsyncThunk<void, PortfolioAndAssetsUpsertPayload>(
  'nft/upsertPortfolioAndAssets',
  ({ nftsById }, { dispatch, state }) => {
    const assetsById = selectAssets(state)
    const assetsToUpsert = Object.values(nftsById).reduce<UpsertAssetsPayload>(
      (acc, nft) => {
        acc.byId[nft.assetId] = makeAsset(assetsById, {
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

    const portfolio = cloneDeep<Portfolio>(initialPortfolioState)

    Object.values(nftsById).forEach(nft => {
      const accountId = nft.ownerAccountId

      if (!portfolio.accounts.byId[accountId]) {
        portfolio.accounts.byId[accountId] = { assetIds: [nft.assetId] }
        portfolio.accounts.ids.push(accountId)
      } else {
        portfolio.accounts.byId[accountId].assetIds.push(nft.assetId)
      }

      const balanceData = {
        // i.e 1 for ERC-721s / 0, 1, or more for ERC-1155s
        [nft.assetId]: nft.balance === undefined ? '1' : nft.balance,
      }

      if (bnOrZero(balanceData[nft.assetId]).gt(0)) {
        portfolio.accounts.byId[accountId].hasActivity = true
      }

      if (!portfolio.accountBalances.byId[accountId]) {
        portfolio.accountBalances.byId[accountId] = balanceData
        portfolio.accountBalances.ids.push(accountId)
      } else {
        portfolio.accountBalances.byId[accountId] = Object.assign(
          portfolio.accountBalances.byId[accountId],
          balanceData,
        )
      }
    })

    dispatch(assetsSlice.actions.upsertAssets(assetsToUpsert))
    dispatch(portfolioSlice.actions.upsertPortfolio(portfolio))
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
      queryFn: async ({ accountIds }, { dispatch }) => {
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

        const nftsWithCollectionById = results.reduce<Record<AssetId, NftItemWithCollection>>(
          (acc, result) => {
            if (isRejected(result)) return acc

            if (result.value.data) {
              const { data } = result.value

              data.forEach(item => {
                const { assetId } = item
                if (item.collection.isSpam) return
                if (hasSpammyMedias(item.medias)) return
                if (
                  [item.collection.description, item.collection.name, item.name, item.symbol].some(
                    nftText => isSpammyNftText(nftText),
                  )
                )
                  return
                const { assetReference, chainId } = fromAssetId(assetId)

                const [contractAddress, id] = deserializeNftAssetReference(assetReference)

                const foundNftAssetId = Object.keys(acc).find(accAssetId => {
                  const { assetReference: accAssetReference, chainId: accChainId } =
                    fromAssetId(accAssetId)
                  const [accContractAddress, accId] =
                    deserializeNftAssetReference(accAssetReference)
                  return (
                    accContractAddress === contractAddress && accId === id && accChainId === chainId
                  )
                })

                if (!foundNftAssetId) {
                  acc[assetId] = item
                } else {
                  acc[assetId] = updateNftItem(acc[foundNftAssetId], item)
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

        const nftsWithCollection = Object.values(nftsWithCollectionById)

        const nftsById = nftsWithCollection.reduce<Record<AssetId, NftItem>>((acc, item) => {
          const { collection, ...nftItemWithoutCollection } = item
          const nftItem: NftItem = {
            ...nftItemWithoutCollection,
            collectionId: item.collection.assetId,
          }
          acc[item.assetId] = nftItem
          return acc
        }, {})

        dispatch(nft.actions.upsertNfts({ byId: nftsById, ids: Object.keys(nftsById) }))

        const collectionsById = nftsWithCollection.reduce<NftState['collections']['byId']>(
          (acc, item) => {
            if (!item.collection.assetId) return acc
            acc[item.collection.assetId] = item.collection
            return acc
          },
          {},
        )

        dispatch(
          nft.actions.upsertCollections({
            byId: collectionsById,
            ids: Object.keys(collectionsById),
          }),
        )

        dispatch(upsertPortfolioAndAssets({ nftsById }))

        const data = Object.values(nftsById)

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

export const { useGetNftCollectionQuery, useGetNftUserTokensQuery } = nftApi
