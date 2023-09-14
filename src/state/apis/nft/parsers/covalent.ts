import type { ChainId } from '@shapeshiftoss/caip'
import { toAccountId, toAssetId } from '@shapeshiftoss/caip'
import type { AssetNamespace } from '@shapeshiftoss/caip/src/assetId/assetId'
import { isSome } from 'lib/utils'
import type { CovalentNftItemSchemaType } from 'state/apis/covalent/validators'

import type { NftItemWithCollection } from '../types'

export const parseToNftItem = (
  covalentItem: CovalentNftItemSchemaType & { ownerAddress: string },
  chainId: ChainId,
): NftItemWithCollection[] => {
  return (covalentItem.nft_data ?? [])
    .map(nftData => {
      const medias = nftData.external_data?.image
        ? [
            {
              type: 'image',
              originalUrl: nftData.external_data.image,
            },
          ]
        : []

      if (!(covalentItem.contract_address && covalentItem.supports_erc?.length)) return undefined

      const item: NftItemWithCollection = {
        name: covalentItem.contract_name,
        chainId,
        ownerAccountId: toAccountId({
          chainId,
          account: covalentItem.ownerAddress,
        }),
        assetId: toAssetId({
          // Yeah, it's weird, but this is how Covalent does it
          assetReference: `${covalentItem.contract_address}/${nftData.token_id}`,
          assetNamespace: covalentItem.supports_erc[
            covalentItem.supports_erc.length - 1
          ] as AssetNamespace,
          chainId,
        }),
        id: nftData.token_id,
        symbol: covalentItem.contract_ticker_symbol,
        medias,
        price: '', // Covalent doesn't provide spot pricing for NFT items
        rarityRank: null, // Covalent doesn't provide rarity rank
        description: nftData.external_data?.description ?? '',
        collection: {
          assetId: toAssetId({
            // Yeah, it's weird, but this is how Covalent does it
            assetReference: covalentItem.contract_address,
            assetNamespace: covalentItem.supports_erc[
              covalentItem.supports_erc.length - 1
            ] as AssetNamespace,
            chainId,
          }),
          chainId,
          description: '', // Covalent doesn't provide collection description
          name: covalentItem.contract_name || 'Collection',
          floorPrice: '', // Covalent doesn't provide floor price
          openseaId: '', // Covalent doesn't provide an openseaId
          socialLinks: nftData.external_data?.external_url
            ? [
                {
                  key: 'website',
                  displayName: 'Website',
                  url: nftData.external_data.external_url,
                },
              ]
            : [],
        },
      }

      return item
    })
    .filter(isSome)
}
