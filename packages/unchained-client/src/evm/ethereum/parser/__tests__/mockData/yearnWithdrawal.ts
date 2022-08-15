import { mempoolMock } from './mempoolMock'

const yearnWithdrawal = {
  txid: '0xf76726fa317df7e7785254f5f9f59d68fd303aeba108e8f883c938250afcfd46',
  blockHash: '0xd87a7780344aa3d2e7372cec0b01d0583967189454864a0b70186e834cd6f02f',
  blockHeight: 14257654,
  timestamp: 1645556924,
  status: 1,
  from: '0x1399D13F3A0aaf08f7C5028D81447a311e4760c4',
  to: '0x671a912C10bba0CFA74Cfc2d6Fba9BA1ed9530B2',
  confirmations: 555662,
  value: '0',
  fee: '19460274119661600',
  gasLimit: '242212',
  gasUsed: '192014',
  gasPrice: '101348204400',
  inputData:
    '0x00f714ce00000000000000000000000000000000000000000000000006d944aee58a5e460000000000000000000000001399d13f3a0aaf08f7c5028d81447a311e4760c4',
  tokenTransfers: [
    {
      contract: '0x514910771AF9Ca656af840dff83E8264EcF986CA',
      decimals: 18,
      name: 'ChainLink Token',
      symbol: 'LINK',
      type: 'ERC20',
      from: '0x43921eb2E5C78D9e887d3Ecd4620a3Bd606f4F95',
      to: '0xf6D87dFC0841A289614B3d6fdb78D956ebd3cfF0',
      value: '500482168225493862',
    },
    {
      contract: '0x514910771AF9Ca656af840dff83E8264EcF986CA',
      decimals: 18,
      name: 'ChainLink Token',
      symbol: 'LINK',
      type: 'ERC20',
      from: '0xf6D87dFC0841A289614B3d6fdb78D956ebd3cfF0',
      to: '0x671a912C10bba0CFA74Cfc2d6Fba9BA1ed9530B2',
      value: '500482168225493862',
    },
    {
      contract: '0x671a912C10bba0CFA74Cfc2d6Fba9BA1ed9530B2',
      decimals: 18,
      name: 'LINK yVault',
      symbol: 'yvLINK',
      type: 'ERC20',
      from: '0x1399D13F3A0aaf08f7C5028D81447a311e4760c4',
      to: '0x0000000000000000000000000000000000000000',
      value: '493501152139828806',
    },
    {
      contract: '0x514910771AF9Ca656af840dff83E8264EcF986CA',
      decimals: 18,
      name: 'ChainLink Token',
      symbol: 'LINK',
      type: 'ERC20',
      from: '0x671a912C10bba0CFA74Cfc2d6Fba9BA1ed9530B2',
      to: '0x1399D13F3A0aaf08f7C5028D81447a311e4760c4',
      value: '500482168225493862',
    },
  ],
}

export default {
  tx: yearnWithdrawal,
  txMempool: mempoolMock(yearnWithdrawal),
}
