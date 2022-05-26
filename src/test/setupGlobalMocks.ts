jest.mock('@shapeshiftoss/market-service', () => ({
  findAll: jest.fn,
  findByAssetId: jest.fn,
  findPriceHistoryByAssetId: jest.fn,
}))

export {}
