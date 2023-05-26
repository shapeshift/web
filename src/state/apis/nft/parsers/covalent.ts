import type { ChainId } from '@shapeshiftoss/caip'
import { toAssetId } from '@shapeshiftoss/caip'
import type { AssetNamespace } from '@shapeshiftoss/caip/src/assetId/assetId'
import type { CovalentNftItemSchemaType } from 'state/apis/covalent/validators'

import type { NftItem } from '../types'

export const parseToNftItem = (
  covalentItem: CovalentNftItemSchemaType,
  chainId: ChainId,
): NftItem[] => {
  return (
    covalentItem.nft_data?.map(nftData => {
      const medias = nftData.external_data?.image
        ? [
            {
              type: 'image',
              originalUrl: nftData.external_data.image,
            },
          ]
        : []

      const item: NftItem = {
        name: covalentItem.contract_name,
        chainId,
        id: nftData.token_id,
        medias,
        price: null, // Covalent doesn't provide spot pricing for NFT items
        rarityRank: null, // Covalent doesn't provide rarity rank
        description: nftData.external_data?.description || '',
        collection: {
          id:
            covalentItem.contract_address && covalentItem.supports_erc?.length
              ? toAssetId({
                  // Yeah, it's weird, but this is how Covalent does it
                  assetReference: covalentItem.contract_address,
                  assetNamespace: covalentItem.supports_erc[
                    covalentItem.supports_erc.length - 1
                  ] as AssetNamespace,
                  chainId,
                })
              : '',
          chainId,
          description: null, // Covalent doesn't provide collection description
          name: covalentItem.contract_name ?? 'Collection',
          floorPrice: null, // Covalent doesn't provide floor price
          openseaId: null, // Covalent doesn't provide an openseaId
          socialLinks: nftData.external_data?.external_url
            ? [
                {
                  name: 'website',
                  label: 'Website',
                  url: nftData.external_data.external_url,
                  logoUrl: '',
                },
              ]
            : [],
        },
      }

      return item
    }) ?? []
  )
}
