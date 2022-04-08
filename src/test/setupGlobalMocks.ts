jest.mock('@shapeshiftoss/market-service', () => ({
  findAll: jest.fn,
  findByCaip19: jest.fn,
  findPriceHistoryByCaip19: jest.fn,
}))

export {}
