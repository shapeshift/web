import { mempoolMock } from './mempoolMock'

const yearnApproval = {
  txid: '0x72f780a8c46f20f59b9a62dd7032d02d8f284444f49238b4b957a395423ba820',
  blockHash: '0x1f2328b83caf22a839e7142118516532f04ef88285e86ce3458dcde9dcd06c57',
  blockHeight: 14033422,
  timestamp: 1642560983,
  status: 1,
  from: '0x1399D13F3A0aaf08f7C5028D81447a311e4760c4',
  to: '0x514910771AF9Ca656af840dff83E8264EcF986CA',
  confirmations: 779901,
  value: '0',
  fee: '4519526097650998',
  gasLimit: '46643',
  gasUsed: '46643',
  gasPrice: '96896127986',
  inputData:
    '0x095ea7b30000000000000000000000006a1e73f12018d8e5f966ce794aa2921941feb17e00000000000000000fffffffffffffffffffffffffffffffffffffffffffffff',
}

export default {
  tx: yearnApproval,
  txMempool: mempoolMock(yearnApproval),
}
