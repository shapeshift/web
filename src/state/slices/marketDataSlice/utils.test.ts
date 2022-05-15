import { marketData } from './testData'
import { normalizePriceHistory } from './utils'

describe('normalizePriceHistory', () => {
  const granularData = marketData.crypto.priceHistory['1M']['eip155:1/slip44:60']
  const sparseData = marketData.fiat.priceHistory['1M'].AUD
  const result = normalizePriceHistory({ granular: granularData, sparse: sparseData })

  it('returns same length result as granular data', () => {
    expect(result.length).toEqual(granularData.length)
  })

  it('returns result dates same as granular dates', () => {
    result.forEach(({ date }, i) => {
      expect(date).toEqual(granularData[i].date)
    })
  })

  it('returns same first sparse and granular price', () => {
    expect(result[0].price).toEqual(sparseData[0].price)
  })

  it('returns same last sparse and granular price', () => {
    expect(result[result.length - 1].price).toEqual(sparseData[sparseData.length - 1].price)
  })
})
