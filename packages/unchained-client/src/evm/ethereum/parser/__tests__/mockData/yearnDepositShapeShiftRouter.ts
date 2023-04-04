import { mempoolMock } from './mempoolMock'

const yearnDepositShapeShiftRouter = {
  txid: '0xcb6f3702249a22e10e5330ad43b3eed548966cf09c3f5bb423d7835511c991fb',
  blockHash: '0x5ca865c22d32c793d6db4d5e6d31caf34ed84c4ccf5a1789d13662b7880c80a4',
  blockHeight: 14033428,
  timestamp: 1642561118,
  status: 1,
  from: '0x1399D13F3A0aaf08f7C5028D81447a311e4760c4',
  to: '0x6a1e73f12018D8e5f966ce794aa2921941feB17E',
  confirmations: 779890,
  value: '0',
  fee: '18139009291874667',
  gasLimit: '189725',
  gasUsed: '150063',
  gasPrice: '120875960709',
  inputData:
    '0x20e8c565000000000000000000000000514910771af9ca656af840dff83e8264ecf986ca0000000000000000000000001399d13f3a0aaf08f7c5028d81447a311e4760c40000000000000000000000000000000000000000000000000de09397320326740000000000000000000000000000000000000000000000000000000000000000',
  tokenTransfers: [
    {
      contract: '0x514910771AF9Ca656af840dff83E8264EcF986CA',
      decimals: 18,
      name: 'ChainLink Token',
      symbol: 'LINK',
      type: 'ERC20',
      from: '0x1399D13F3A0aaf08f7C5028D81447a311e4760c4',
      to: '0x6a1e73f12018D8e5f966ce794aa2921941feB17E',
      value: '999961394864662132',
    },
    {
      contract: '0x671a912C10bba0CFA74Cfc2d6Fba9BA1ed9530B2',
      decimals: 18,
      name: 'LINK yVault',
      symbol: 'yvLINK',
      type: 'ERC20',
      from: '0x0000000000000000000000000000000000000000',
      to: '0x1399D13F3A0aaf08f7C5028D81447a311e4760c4',
      value: '987002304279657611',
    },
    {
      contract: '0x514910771AF9Ca656af840dff83E8264EcF986CA',
      decimals: 18,
      name: 'ChainLink Token',
      symbol: 'LINK',
      type: 'ERC20',
      from: '0x6a1e73f12018D8e5f966ce794aa2921941feB17E',
      to: '0x671a912C10bba0CFA74Cfc2d6Fba9BA1ed9530B2',
      value: '999961394864662132',
    },
  ],
}

export default {
  tx: yearnDepositShapeShiftRouter,
  txMempool: mempoolMock(yearnDepositShapeShiftRouter),
}
