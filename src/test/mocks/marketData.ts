export const mockMarketData = (obj?: Record<string, any>) => ({
  price: '10',
  marketCap: '100',
  volume: '100',
  changePercent24Hr: 2,
  ...obj,
})
