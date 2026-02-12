module.exports = {
  WalletContractV4: {
    create: vi.fn().mockReturnValue({
      address: { toString: vi.fn().mockReturnValue("mock-address") },
      init: { code: null, data: null },
      createTransfer: vi.fn(),
    }),
  },
  TonClient: vi.fn(),
};
