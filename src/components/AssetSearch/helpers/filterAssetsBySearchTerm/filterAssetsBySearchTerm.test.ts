import { filterAssetsBySearchTerm } from './filterAssetsBySearchTerm'

const assets = [
  {
    address: '0x9124248f2AD8c94fC4a403588BE7a77984B34bb8',
    symbol: 'ETH',
    name: 'Ethereum'
  },
  { address: '3Er42Ft2ZAyAbrpQ1PJUfgF7LbdJztcycd', symbol: 'BTC', name: 'Bitcoin' },
  {
    address: '0x79be75ffc64dd58e66787e4eae470c8a1fd08ba4',
    symbol: 'AAMMDAI',
    name: 'Aave AMM DAI'
  },
  { address: '0x6b175474e89094c44da98b954eedeac495271d0f', symbol: 'DAI', name: 'DAI' }
]

describe('filterAssetsBySearchTerm', () => {
  it('returns based on symbol', () => {
    const returnedAssets = filterAssetsBySearchTerm('btc', assets)
    expect(returnedAssets[0].symbol).toBe('BTC')
  })

  it('returns based on displayName', () => {
    const returnedAssets = filterAssetsBySearchTerm('Bitcoin', assets)
    expect(returnedAssets[0].name).toBe('Bitcoin')
  })

  it('returns based on address', () => {
    const returnedAssets = filterAssetsBySearchTerm(assets[0].address, assets)
    expect(returnedAssets[0].symbol).toBe('ETH')
  })

  it('returns closest match instead of the first one in the array', () => {
    const returnedAssets = filterAssetsBySearchTerm('DAI', assets)
    expect(returnedAssets[0].symbol).toBe('DAI')
  })
})
