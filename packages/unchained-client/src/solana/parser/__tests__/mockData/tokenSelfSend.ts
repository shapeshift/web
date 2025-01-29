import type { Tx } from '../../..'

const tx: Tx = {
  txid: '2GcoTakKNRuAwsNRc5RgZJNwvw4JNe73ciJUsopRGgDcY5s4632TVzAxXRmPUuvu2CmBksUnsuPCvZav2Uw1DsvS',
  blockHeight: 297092056,
  description:
    'DsYwEVzeSNMkU5PVwjwtZ8EDRQxaR6paXfFAdhMQxmaV transferred 0.5 USDC to DsYwEVzeSNMkU5PVwjwtZ8EDRQxaR6paXfFAdhMQxmaV.',
  type: 'TRANSFER',
  source: 'SOLANA_PROGRAM_LIBRARY',
  fee: 5000,
  feePayer: 'DsYwEVzeSNMkU5PVwjwtZ8EDRQxaR6paXfFAdhMQxmaV',
  signature:
    '2GcoTakKNRuAwsNRc5RgZJNwvw4JNe73ciJUsopRGgDcY5s4632TVzAxXRmPUuvu2CmBksUnsuPCvZav2Uw1DsvS',
  slot: 297092056,
  timestamp: 1729619880,
  tokenTransfers: [
    {
      fromTokenAccount: '8suMXgzzmbBpc4s12REVd6EbvmNhpEq7eAfEyj4DQSeH',
      toTokenAccount: '8suMXgzzmbBpc4s12REVd6EbvmNhpEq7eAfEyj4DQSeH',
      fromUserAccount: 'DsYwEVzeSNMkU5PVwjwtZ8EDRQxaR6paXfFAdhMQxmaV',
      toUserAccount: 'DsYwEVzeSNMkU5PVwjwtZ8EDRQxaR6paXfFAdhMQxmaV',
      tokenAmount: 0.5,
      decimals: 0,
      mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
      tokenStandard: 'Fungible',
    },
  ],
  nativeTransfers: [],
  accountData: [
    {
      account: 'DsYwEVzeSNMkU5PVwjwtZ8EDRQxaR6paXfFAdhMQxmaV',
      nativeBalanceChange: -5000,
      tokenBalanceChanges: [],
    },
    {
      account: '8suMXgzzmbBpc4s12REVd6EbvmNhpEq7eAfEyj4DQSeH',
      nativeBalanceChange: 0,
      tokenBalanceChanges: [],
    },
    {
      account: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
      nativeBalanceChange: 0,
      tokenBalanceChanges: [],
    },
    {
      account: 'ComputeBudget111111111111111111111111111111',
      nativeBalanceChange: 0,
      tokenBalanceChanges: [],
    },
  ],
  transactionError: null,
  instructions: [
    {
      accounts: [
        '8suMXgzzmbBpc4s12REVd6EbvmNhpEq7eAfEyj4DQSeH',
        '8suMXgzzmbBpc4s12REVd6EbvmNhpEq7eAfEyj4DQSeH',
        'DsYwEVzeSNMkU5PVwjwtZ8EDRQxaR6paXfFAdhMQxmaV',
      ],
      data: '3Jv73z5Y9SRV',
      programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
      innerInstructions: [],
    },
    {
      accounts: [],
      data: 'Fn1tZ5',
      programId: 'ComputeBudget111111111111111111111111111111',
      innerInstructions: [],
    },
    {
      accounts: [],
      data: '3DTZbgwsozUF',
      programId: 'ComputeBudget111111111111111111111111111111',
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
