import type { Tx } from '../../..'

const tx: Tx = {
  txid: '3owXWn8Em7FE7Dyao3kPLkTPySiGGSSo9e7VGiWDifk6GfQRrm2JYHdHStBzVRr6b6o1PztbGpuDsXb8o2yPxoV3',
  blockHeight: 293321352,
  description:
    'DsYwEVzeSNMkU5PVwjwtZ8EDRQxaR6paXfFAdhMQxmaV transferred 0.000000001 SOL to DsYwEVzeSNMkU5PVwjwtZ8EDRQxaR6paXfFAdhMQxmaV.',
  type: 'TRANSFER',
  source: 'SYSTEM_PROGRAM',
  fee: 25000,
  feePayer: 'DsYwEVzeSNMkU5PVwjwtZ8EDRQxaR6paXfFAdhMQxmaV',
  signature:
    '3owXWn8Em7FE7Dyao3kPLkTPySiGGSSo9e7VGiWDifk6GfQRrm2JYHdHStBzVRr6b6o1PztbGpuDsXb8o2yPxoV3',
  slot: 293321352,
  timestamp: 1727896282,
  tokenTransfers: [],
  nativeTransfers: [
    {
      fromUserAccount: 'DsYwEVzeSNMkU5PVwjwtZ8EDRQxaR6paXfFAdhMQxmaV',
      toUserAccount: 'DsYwEVzeSNMkU5PVwjwtZ8EDRQxaR6paXfFAdhMQxmaV',
      amount: 1,
    },
  ],
  accountData: [
    {
      account: 'DsYwEVzeSNMkU5PVwjwtZ8EDRQxaR6paXfFAdhMQxmaV',
      nativeBalanceChange: -25000,
      tokenBalanceChanges: [],
    },
    {
      account: 'ComputeBudget111111111111111111111111111111',
      nativeBalanceChange: 0,
      tokenBalanceChanges: [],
    },
    {
      account: '11111111111111111111111111111111',
      nativeBalanceChange: 0,
      tokenBalanceChanges: [],
    },
  ],
  transactionError: null,
  instructions: [
    {
      accounts: [],
      data: '3gJqkocMWaMm',
      programId: 'ComputeBudget111111111111111111111111111111',
      innerInstructions: [],
    },
    {
      accounts: [],
      data: 'Fj2Eoy',
      programId: 'ComputeBudget111111111111111111111111111111',
      innerInstructions: [],
    },
    {
      accounts: [
        'DsYwEVzeSNMkU5PVwjwtZ8EDRQxaR6paXfFAdhMQxmaV',
        'DsYwEVzeSNMkU5PVwjwtZ8EDRQxaR6paXfFAdhMQxmaV',
      ],
      data: '3Bxs412MvVNQj175',
      programId: '11111111111111111111111111111111',
      innerInstructions: [],
    },
  ],
  events: {
    compressed: null,
    nft: null,
    swap: null,
  },
}

export default { tx }
