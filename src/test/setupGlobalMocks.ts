jest.mock('@keepkey/market-service', () => ({
  findAll: jest.fn,
  findByAssetId: jest.fn,
  findPriceHistoryByAssetId: jest.fn,
}))

export {}
