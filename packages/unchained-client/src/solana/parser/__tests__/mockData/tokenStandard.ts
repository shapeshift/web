import type { Tx } from '../../..'

const tx: Tx = {
  txid: 'KquujeLfsAVaYCP7N9BNpkQKwNgUH7EJie6ko8VUbhocmQHENufKAqZaCRYyjsCYTTytHuzBQeEz9tGx6vGigLA',
  blockHeight: 297093008,
  description:
    'DsYwEVzeSNMkU5PVwjwtZ8EDRQxaR6paXfFAdhMQxmaV transferred 0.1 USDC to 9cErDgnadHNmEBMVn3hDAbooRDgnazfVNKhTF5SEQ8RN.',
  type: 'TRANSFER',
  source: 'SOLANA_PROGRAM_LIBRARY',
  fee: 5000,
  feePayer: 'DsYwEVzeSNMkU5PVwjwtZ8EDRQxaR6paXfFAdhMQxmaV',
  signature:
    'KquujeLfsAVaYCP7N9BNpkQKwNgUH7EJie6ko8VUbhocmQHENufKAqZaCRYyjsCYTTytHuzBQeEz9tGx6vGigLA',
  slot: 297093008,
  timestamp: 1729620332,
  tokenTransfers: [
    {
      fromTokenAccount: '8suMXgzzmbBpc4s12REVd6EbvmNhpEq7eAfEyj4DQSeH',
      toTokenAccount: 'Eb3quTucZ9FGRMLtGzkrmzNFDZgzM1F8x56VyvBY5SZV',
      fromUserAccount: 'DsYwEVzeSNMkU5PVwjwtZ8EDRQxaR6paXfFAdhMQxmaV',
      toUserAccount: '9cErDgnadHNmEBMVn3hDAbooRDgnazfVNKhTF5SEQ8RN',
      tokenAmount: 0.1,
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
      tokenBalanceChanges: [
        {
          userAccount: 'DsYwEVzeSNMkU5PVwjwtZ8EDRQxaR6paXfFAdhMQxmaV',
          tokenAccount: '8suMXgzzmbBpc4s12REVd6EbvmNhpEq7eAfEyj4DQSeH',
          rawTokenAmount: {
            tokenAmount: '-100000',
            decimals: 6,
          },
          mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        },
      ],
    },
    {
      account: 'Eb3quTucZ9FGRMLtGzkrmzNFDZgzM1F8x56VyvBY5SZV',
      nativeBalanceChange: 0,
      tokenBalanceChanges: [
        {
          userAccount: '9cErDgnadHNmEBMVn3hDAbooRDgnazfVNKhTF5SEQ8RN',
          tokenAccount: 'Eb3quTucZ9FGRMLtGzkrmzNFDZgzM1F8x56VyvBY5SZV',
          rawTokenAmount: {
            tokenAmount: '100000',
            decimals: 6,
          },
          mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        },
      ],
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
        'Eb3quTucZ9FGRMLtGzkrmzNFDZgzM1F8x56VyvBY5SZV',
        'DsYwEVzeSNMkU5PVwjwtZ8EDRQxaR6paXfFAdhMQxmaV',
      ],
      data: '3gJqkocMWaMm',
      programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
      innerInstructions: [],
    },
    {
      accounts: [],
      data: 'G8n3yq',
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
