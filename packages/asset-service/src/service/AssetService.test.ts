import { Asset, ChainTypes, NetworkTypes } from '@shapeshiftoss/types'
import axios from 'axios'

import { AssetService } from './AssetService'
import descriptions from './descriptions.json'

jest.mock('axios')

const mockedAxios = axios as jest.Mocked<typeof axios>

const EthAsset: Asset = {
  assetId: 'eip155:3/slip44:60',
  chainId: 'eip155:3',
  chain: ChainTypes.Ethereum,
  network: NetworkTypes.ETH_ROPSTEN,
  symbol: 'ETH',
  name: 'Ropsten Testnet Ethereum',
  precision: 18,
  color: '#FFFFFF',
  icon: 'https://assets.coincap.io/assets/icons/eth@2x.png',
  explorer: 'https://ropsten.etherscan.io/',
  explorerTxLink: 'https://ropsten.etherscan.io/tx/',
  explorerAddressLink: 'https://ropsten.etherscan.io/address/'
}

jest.mock(
  './descriptions.json',
  () => ({
    'eip155:3/slip44:60': 'overridden description'
  }),
  { virtual: true }
)

jest.mock(
  './generatedAssetData.json',
  () => ({
    'eip155:3/slip44:60': 'a blue fox'
  }),
  { virtual: true }
)

describe('AssetService', () => {
  describe('description', () => {
    it('should return the overridden description if it exists', async () => {
      const assetService = new AssetService()

      await expect(assetService.description(EthAsset.assetId)).resolves.toEqual({
        description: 'overridden description',
        isTrusted: true
      })
    })

    it('should return a string if found', async () => {
      const assetDescriptions = descriptions as Record<string, string>
      delete assetDescriptions[EthAsset.assetId]

      const assetService = new AssetService()
      const description = { en: 'a blue fox' }
      mockedAxios.get.mockResolvedValue({ data: { description } })
      await expect(assetService.description(EthAsset.assetId)).resolves.toEqual({
        description: description.en
      })
    })

    it('should throw if not found', async () => {
      const assetService = new AssetService()
      mockedAxios.get.mockRejectedValue({ data: null })
      const tokenData: Asset = {
        assetId: 'eip155:3/erc20:0x1da00b6fc705f2ce4c25d7e7add25a3cc045e54a',
        chainId: 'eip155:3',
        chain: ChainTypes.Ethereum,
        explorer: 'https://etherscan.io',
        explorerTxLink: 'https://etherscan.io/tx/',
        explorerAddressLink: 'https://etherscan.io/address/',
        network: NetworkTypes.MAINNET,
        name: 'Test Token',
        precision: 18,
        color: '#FFFFFF',
        icon: 'https://assets.coingecko.com/coins/images/17049/thumb/BUNNY.png?1626148809',
        symbol: 'TST'
      }
      const expectedErrorMessage = `AssetService:description: no description available for ${tokenData.assetId}`
      await expect(assetService.description(tokenData.assetId)).rejects.toEqual(
        new Error(expectedErrorMessage)
      )
    })
  })
})
