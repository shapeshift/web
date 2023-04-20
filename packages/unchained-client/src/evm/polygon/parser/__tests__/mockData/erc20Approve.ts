import type { Tx } from '../../../../../generated/polygon'
import { mempoolMock } from './mempoolMock'

const erc20Approve: Tx = {
  txid: '0x27f0a1a889c6bb806c23cee7a2a51bd191580dfc150e37642d3b8994cca38fb3',
  blockHash: '0x5ef1acab5e078b0eb15dba1c6cccfc284c594a93962853dcdfbfee627046edea',
  blockHeight: 41719778,
  timestamp: 1681933908,
  status: 1,
  from: '0x526fE73a7B21cB7A16b277b2d067B2C8478e5249',
  to: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
  confirmations: 10,
  value: '0',
  fee: '14285788388942070',
  gasLimit: '105792',
  gasUsed: '58110',
  gasPrice: '245840447237',
  inputData:
    '0x095ea7b300000000000000000000000045a01e4e04f14f7a4a6702c74187c5f6222033cd000000000000000000000000000000000000000000000000000000003eb131c0',
  internalTxs: [],
}

export default {
  tx: erc20Approve,
  txMempool: mempoolMock(erc20Approve),
}
