import { createSlice, prepareAutoBatched } from '@reduxjs/toolkit'
import { createApi } from '@reduxjs/toolkit/dist/query/react'
import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import { fromAccountId, fromAssetId } from '@shapeshiftoss/caip'
import { NftFilters } from 'alchemy-sdk'
import { PURGE } from 'redux-persist'
import { getAlchemyInstanceByChainId } from 'lib/alchemySdkInstance'
import { logger } from 'lib/logger'
import { isFulfilled } from 'lib/utils'
import type { WalletId } from 'state/slices/portfolioSlice/portfolioSliceCommon'

import { BASE_RTK_CREATE_API_CONFIG } from '../const'
import { covalentApi } from '../covalent/covalentApi'
import { zapperApi } from '../zapper/zapperApi'
import {
  parseAlchemyNftContractToCollectionItem,
  parseAlchemyOwnedNftToNftItem,
} from './parsers/alchemy'
import type { NftCollectionType, NftItem } from './types'
import { updateNftItem } from './utils'

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
}
const initialState: NftState = {
  selectedNftAvatarByWalletId: {},
}

export const nft = createSlice({
  name: 'nftData',
  initialState,
  reducers: {
    clear: () => initialState,
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
        const getAlchemyNftData = async (accountIds: AccountId[]): Promise<{ data: NftItem[] }> => {
          const items = (
            await Promise.allSettled(
              accountIds.map(async accountId => {
                const { account: address, chainId } = fromAccountId(accountId)

                const nftItems = await getAlchemyInstanceByChainId(chainId)
                  .nft.getNftsForOwner(address, { excludeFilters: [NftFilters.SPAM] })
                  .then(({ ownedNfts }) =>
                    ownedNfts.map(ownedNft => parseAlchemyOwnedNftToNftItem(ownedNft, chainId)),
                  )

                return nftItems
              }),
            )
          )
            .filter(isFulfilled)
            .flatMap(({ value }) => value)

          return { data: items }
        }

        const services = [
          getAlchemyNftData,
          (accountIds: AccountId[]) =>
            dispatch(zapperApi.endpoints.getZapperNftUserTokens.initiate({ accountIds })),
          (accountIds: AccountId[]) =>
            dispatch(covalentApi.endpoints.getCovalentNftUserTokens.initiate({ accountIds })),
        ]

        const results = await Promise.all(services.map(service => service(accountIds)))

        const data = results.reduce<NftItem[]>((acc, result) => {
          if (result.data) {
            const { data } = result

            data.forEach(item => {
              const originalItemIndex = acc.findIndex(
                accItem => accItem.id === item.id && accItem.collection.id === item.collection.id,
              )

              if (originalItemIndex === -1) {
                acc.push(item)
              } else {
                const updatedItem = updateNftItem(acc[originalItemIndex], item)
                acc[originalItemIndex] = updatedItem
              }
            })
          } else if (result.isError) {
            moduleLogger.error({ error: result.error }, 'Failed to fetch nft user data')
          }

          return acc
        }, [])
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
