import bs58 from 'bs58'
import {
  _void,
  Bytes,
  createCodec,
  Enum,
  Option,
  Struct,
  Tuple,
  u16,
  u32,
  u64,
  u128,
  Vector,
} from 'scale-ts'
import { bytesToHex, hexToBytes, isHex } from 'viem'

import {
  ENVIRONMENT_BATCH_CALL_INDEX,
  ENVIRONMENT_NON_NATIVE_SIGNED_CALL_INDEX,
  ENVIRONMENT_PALLET_INDEX,
  LENDING_POOLS_CALL_INDEX,
  LENDING_POOLS_PALLET_INDEX,
  LIQUIDITY_PROVIDER_CALL_INDEX,
  LIQUIDITY_PROVIDER_PALLET_INDEX,
} from './constants'
import type { ChainflipAsset } from './types'

type ChainflipAssetAmount = {
  asset: ChainflipAsset
  amount: ChainflipAmountInput
}

type ChainflipAmountInput = bigint | number | string

type ChainflipEncodedAddress = {
  chain: 'Ethereum' | 'Polkadot' | 'Bitcoin' | 'Arbitrum' | 'Solana' | 'Assethub'
  address: Uint8Array | string
}

type ChainflipSignatureInput = {
  signature: Uint8Array | string
  signer: Uint8Array | string
  sigType?: 'Eip712' | 'PersonalSign'
}

type ChainflipTransactionMetadataInput = {
  nonce: number
  expiryBlock: number
}

type ChainflipRuntimeAsset =
  | 'Eth'
  | 'Flip'
  | 'Usdc'
  | 'Dot'
  | 'Btc'
  | 'ArbEth'
  | 'ArbUsdc'
  | 'Usdt'
  | 'Sol'
  | 'SolUsdc'
  | 'HubDot'
  | 'HubUsdt'
  | 'HubUsdc'
  | 'Wbtc'
  | 'ArbUsdt'
  | 'SolUsdt'

const RUNTIME_ASSET_VARIANTS: ChainflipRuntimeAsset[] = [
  'Eth',
  'Flip',
  'Usdc',
  'Dot',
  'Btc',
  'ArbEth',
  'ArbUsdc',
  'Usdt',
  'Sol',
  'SolUsdc',
  'HubDot',
  'HubUsdt',
  'HubUsdc',
  'Wbtc',
  'ArbUsdt',
  'SolUsdt',
]

// CF's runtime asset enum uses 1-indexed discriminants (not 0). The EIP-712 pipeline verifies
// the spec version at sign time via stateGetRuntimeVersion(); pallet/call indices are stable
// across CF runtime upgrades and match the live mainnet metadata (specVersion >= 20012).
const RUNTIME_ASSET_INDICES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16] as const

const runtimeAssetCodec = Enum(
  {
    Eth: _void,
    Flip: _void,
    Usdc: _void,
    Dot: _void,
    Btc: _void,
    ArbEth: _void,
    ArbUsdc: _void,
    Usdt: _void,
    Sol: _void,
    SolUsdc: _void,
    HubDot: _void,
    HubUsdt: _void,
    HubUsdc: _void,
    Wbtc: _void,
    ArbUsdt: _void,
    SolUsdt: _void,
  },
  RUNTIME_ASSET_INDICES,
)

const runtimeAssetIndexByTag = new Map<ChainflipRuntimeAsset, number>(
  RUNTIME_ASSET_VARIANTS.map((asset, index) => [asset, RUNTIME_ASSET_INDICES[index]]),
)

const encodedAddressCodec = Enum({
  Eth: Bytes(20),
  Dot: Bytes(32),
  Btc: Bytes(),
  Arb: Bytes(20),
  Sol: Bytes(32),
  Hub: Bytes(32),
})

const signatureDataCodec = Enum({
  Solana: Struct({
    signature: Bytes(64),
    signer: Bytes(32),
    sigType: Enum({
      Domain: _void,
    }),
  }),
  Ethereum: Struct({
    signature: Bytes(65),
    signer: Bytes(20),
    sigType: Enum({
      PersonalSign: _void,
      Eip712: _void,
    }),
  }),
})

const transactionMetadataCodec = Struct({
  nonce: u32,
  expiryBlock: u32,
})

const rawBytesCodec = createCodec<Uint8Array>(
  (value: Uint8Array) => value,
  () => {
    throw new Error('Raw bytes decoding is unsupported')
  },
)

const repaymentAmountCodec = Enum({
  Full: _void,
  Exact: u128,
})

const lendingPoolsCallCodec = Enum(
  {
    AddLenderFunds: Struct({
      asset: runtimeAssetCodec,
      amount: u128,
    }),
    RemoveLenderFunds: Struct({
      asset: runtimeAssetCodec,
      amount: Option(u128),
    }),
    AddCollateral: Struct({
      collateralTopupAsset: Option(runtimeAssetCodec),
      collateral: Vector(Tuple(runtimeAssetCodec, u128)),
    }),
    RemoveCollateral: Struct({
      collateral: Vector(Tuple(runtimeAssetCodec, u128)),
    }),
    RequestLoan: Struct({
      loanAsset: runtimeAssetCodec,
      loanAmount: u128,
      collateralTopupAsset: Option(runtimeAssetCodec),
      extraCollateral: Vector(Tuple(runtimeAssetCodec, u128)),
    }),
    UpdateCollateralTopupAsset: Struct({
      collateralTopupAsset: Option(runtimeAssetCodec),
    }),
    ExpandLoan: Struct({
      loanId: u64,
      extraAmountToBorrow: u128,
      extraCollateral: Vector(Tuple(runtimeAssetCodec, u128)),
    }),
    MakeRepayment: Struct({
      loanId: u64,
      amount: repaymentAmountCodec,
    }),
    InitiateVoluntaryLiquidation: _void,
    StopVoluntaryLiquidation: _void,
  },
  [
    LENDING_POOLS_CALL_INDEX.AddLenderFunds,
    LENDING_POOLS_CALL_INDEX.RemoveLenderFunds,
    LENDING_POOLS_CALL_INDEX.AddCollateral,
    LENDING_POOLS_CALL_INDEX.RemoveCollateral,
    LENDING_POOLS_CALL_INDEX.RequestLoan,
    LENDING_POOLS_CALL_INDEX.UpdateCollateralTopupAsset,
    LENDING_POOLS_CALL_INDEX.ExpandLoan,
    LENDING_POOLS_CALL_INDEX.MakeRepayment,
    LENDING_POOLS_CALL_INDEX.InitiateVoluntaryLiquidation,
    LENDING_POOLS_CALL_INDEX.StopVoluntaryLiquidation,
  ],
)

const liquidityProviderCallCodec = Enum(
  {
    RequestLiquidityDepositAddress: Struct({
      asset: runtimeAssetCodec,
      boostFee: u16,
    }),
    WithdrawAsset: Struct({
      amount: u128,
      asset: runtimeAssetCodec,
      destinationAddress: encodedAddressCodec,
    }),
    RegisterLpAccount: _void,
    RegisterLiquidityRefundAddress: Struct({
      address: encodedAddressCodec,
    }),
  },
  [
    LIQUIDITY_PROVIDER_CALL_INDEX.RequestLiquidityDepositAddress,
    LIQUIDITY_PROVIDER_CALL_INDEX.WithdrawAsset,
    LIQUIDITY_PROVIDER_CALL_INDEX.RegisterLpAccount,
    LIQUIDITY_PROVIDER_CALL_INDEX.RegisterLiquidityRefundAddress,
  ],
)

const environmentCallCodec = Enum(
  {
    NonNativeSignedCall: Struct({
      chainflipExtrinsic: Struct({
        call: rawBytesCodec,
        transactionMetadata: transactionMetadataCodec,
      }),
      signatureData: signatureDataCodec,
    }),
    Batch: Struct({
      calls: Vector(rawBytesCodec),
    }),
  },
  [ENVIRONMENT_NON_NATIVE_SIGNED_CALL_INDEX, ENVIRONMENT_BATCH_CALL_INDEX],
)

const runtimeCallCodec = Enum(
  {
    Environment: environmentCallCodec,
    LiquidityProvider: liquidityProviderCallCodec,
    LendingPools: lendingPoolsCallCodec,
  },
  [ENVIRONMENT_PALLET_INDEX, LIQUIDITY_PROVIDER_PALLET_INDEX, LENDING_POOLS_PALLET_INDEX],
)

const buildRuntimeAssetValue = (
  asset: ChainflipAsset,
): { tag: ChainflipRuntimeAsset; value: undefined } => {
  if (asset.chain === 'Bitcoin' && asset.asset === 'BTC') return { tag: 'Btc', value: undefined }
  if (asset.chain === 'Solana' && asset.asset === 'SOL') return { tag: 'Sol', value: undefined }
  if (asset.chain === 'Ethereum' && asset.asset === 'ETH') return { tag: 'Eth', value: undefined }
  if (asset.chain === 'Ethereum' && asset.asset === 'USDC') return { tag: 'Usdc', value: undefined }
  if (asset.chain === 'Ethereum' && asset.asset === 'USDT') return { tag: 'Usdt', value: undefined }
  if (asset.chain === 'Ethereum' && asset.asset === 'FLIP') return { tag: 'Flip', value: undefined }

  throw new Error(`Unsupported Chainflip asset ${asset.chain}:${asset.asset}`)
}

type AssetAmountPair = [{ tag: ChainflipRuntimeAsset; value: undefined }, bigint]

const buildAssetAmountPairs = (items: ChainflipAssetAmount[]): AssetAmountPair[] => {
  const mapped: AssetAmountPair[] = items.map(({ asset, amount }) => [
    buildRuntimeAssetValue(asset),
    toAmount(amount),
  ])
  return mapped.sort((left, right) => {
    const leftIndex = runtimeAssetIndexByTag.get(left[0].tag) ?? 0
    const rightIndex = runtimeAssetIndexByTag.get(right[0].tag) ?? 0
    return leftIndex - rightIndex
  })
}

const toAmount = (amount: ChainflipAmountInput): bigint => {
  if (typeof amount === 'bigint') return amount
  if (typeof amount === 'number') return BigInt(amount)
  if (isHex(amount)) return BigInt(amount)
  return BigInt(amount)
}

const toHexBytes = (value: string): Uint8Array => {
  if (!isHex(value)) throw new Error('Expected hex string')
  return hexToBytes(value as `0x${string}`)
}

const toBytes = (value: Uint8Array | string): Uint8Array => {
  return typeof value === 'string' ? toHexBytes(value) : value
}

const assertByteLength = (value: Uint8Array, expected: number, label: string): void => {
  if (value.length !== expected) {
    throw new Error(`${label} must be ${expected} bytes`)
  }
}

const encodeRuntimeCallHex = (call: Parameters<typeof runtimeCallCodec.enc>[0]): string => {
  return bytesToHex(runtimeCallCodec.enc(call))
}

export const encodeAddLenderFunds = (
  asset: ChainflipAsset,
  amount: ChainflipAmountInput,
): string => {
  return encodeRuntimeCallHex({
    tag: 'LendingPools',
    value: {
      tag: 'AddLenderFunds',
      value: {
        asset: buildRuntimeAssetValue(asset),
        amount: toAmount(amount),
      },
    },
  })
}

export const encodeRemoveLenderFunds = (
  asset: ChainflipAsset,
  amount: ChainflipAmountInput | null,
): string => {
  return encodeRuntimeCallHex({
    tag: 'LendingPools',
    value: {
      tag: 'RemoveLenderFunds',
      value: {
        asset: buildRuntimeAssetValue(asset),
        amount: amount === null ? undefined : toAmount(amount),
      },
    },
  })
}

export const encodeAddCollateral = (
  collateralTopupAsset: ChainflipAsset | null,
  collateral: ChainflipAssetAmount[],
): string => {
  return encodeRuntimeCallHex({
    tag: 'LendingPools',
    value: {
      tag: 'AddCollateral',
      value: {
        collateralTopupAsset:
          collateralTopupAsset === null ? undefined : buildRuntimeAssetValue(collateralTopupAsset),
        collateral: buildAssetAmountPairs(collateral),
      },
    },
  })
}

export const encodeRemoveCollateral = (collateral: ChainflipAssetAmount[]): string => {
  return encodeRuntimeCallHex({
    tag: 'LendingPools',
    value: {
      tag: 'RemoveCollateral',
      value: {
        collateral: buildAssetAmountPairs(collateral),
      },
    },
  })
}

export const encodeRequestLoan = (
  loanAsset: ChainflipAsset,
  loanAmount: ChainflipAmountInput,
  collateralTopupAsset: ChainflipAsset | null,
  extraCollateral: ChainflipAssetAmount[],
): string => {
  return encodeRuntimeCallHex({
    tag: 'LendingPools',
    value: {
      tag: 'RequestLoan',
      value: {
        loanAsset: buildRuntimeAssetValue(loanAsset),
        loanAmount: toAmount(loanAmount),
        collateralTopupAsset:
          collateralTopupAsset === null ? undefined : buildRuntimeAssetValue(collateralTopupAsset),
        extraCollateral: buildAssetAmountPairs(extraCollateral),
      },
    },
  })
}

export const encodeUpdateCollateralTopupAsset = (
  collateralTopupAsset: ChainflipAsset | null,
): string => {
  return encodeRuntimeCallHex({
    tag: 'LendingPools',
    value: {
      tag: 'UpdateCollateralTopupAsset',
      value: {
        collateralTopupAsset:
          collateralTopupAsset === null ? undefined : buildRuntimeAssetValue(collateralTopupAsset),
      },
    },
  })
}

export const encodeExpandLoan = (
  loanId: bigint | number,
  extraAmountToBorrow: ChainflipAmountInput,
  extraCollateral: ChainflipAssetAmount[],
): string => {
  return encodeRuntimeCallHex({
    tag: 'LendingPools',
    value: {
      tag: 'ExpandLoan',
      value: {
        loanId: typeof loanId === 'bigint' ? loanId : BigInt(loanId),
        extraAmountToBorrow: toAmount(extraAmountToBorrow),
        extraCollateral: buildAssetAmountPairs(extraCollateral),
      },
    },
  })
}

export const encodeMakeRepayment = (
  loanId: bigint | number,
  amount: 'full' | ChainflipAmountInput,
): string => {
  return encodeRuntimeCallHex({
    tag: 'LendingPools',
    value: {
      tag: 'MakeRepayment',
      value: {
        loanId: typeof loanId === 'bigint' ? loanId : BigInt(loanId),
        amount:
          amount === 'full'
            ? { tag: 'Full' as const, value: undefined }
            : { tag: 'Exact' as const, value: toAmount(amount) },
      },
    },
  })
}

export const encodeInitiateVoluntaryLiquidation = (): string => {
  return encodeRuntimeCallHex({
    tag: 'LendingPools',
    value: {
      tag: 'InitiateVoluntaryLiquidation',
      value: undefined,
    },
  })
}

export const encodeStopVoluntaryLiquidation = (): string => {
  return encodeRuntimeCallHex({
    tag: 'LendingPools',
    value: {
      tag: 'StopVoluntaryLiquidation',
      value: undefined,
    },
  })
}

export const encodeRequestLiquidityDepositAddress = (
  asset: ChainflipAsset,
  boostFee: number,
): string => {
  return encodeRuntimeCallHex({
    tag: 'LiquidityProvider',
    value: {
      tag: 'RequestLiquidityDepositAddress',
      value: {
        asset: buildRuntimeAssetValue(asset),
        boostFee,
      },
    },
  })
}

export const encodeWithdrawAsset = (
  amount: ChainflipAmountInput,
  asset: ChainflipAsset,
  destinationAddress: ChainflipEncodedAddress,
): string => {
  return encodeRuntimeCallHex({
    tag: 'LiquidityProvider',
    value: {
      tag: 'WithdrawAsset',
      value: {
        amount: toAmount(amount),
        asset: buildRuntimeAssetValue(asset),
        destinationAddress: buildEncodedAddressValue(destinationAddress),
      },
    },
  })
}

export const encodeRegisterLpAccount = (): string => {
  return encodeRuntimeCallHex({
    tag: 'LiquidityProvider',
    value: {
      tag: 'RegisterLpAccount',
      value: undefined,
    },
  })
}

export const encodeRegisterLiquidityRefundAddress = (address: ChainflipEncodedAddress): string => {
  return encodeRuntimeCallHex({
    tag: 'LiquidityProvider',
    value: {
      tag: 'RegisterLiquidityRefundAddress',
      value: {
        address: buildEncodedAddressValue(address),
      },
    },
  })
}

export const encodeBatch = (calls: (string | Uint8Array)[]): string => {
  if (calls.length > 10) {
    throw new Error('Batch call limit exceeded')
  }

  return encodeRuntimeCallHex({
    tag: 'Environment',
    value: {
      tag: 'Batch',
      value: {
        calls: calls.map(call => (typeof call === 'string' ? toHexBytes(call) : call)),
      },
    },
  })
}

export const encodeNonNativeSignedCall = (
  encodedCallHex: string,
  transactionMetadata: ChainflipTransactionMetadataInput,
  signature: ChainflipSignatureInput,
): string => {
  const signatureBytes = toBytes(signature.signature)
  const signerBytes = toBytes(signature.signer)

  assertByteLength(signatureBytes, 65, 'Signature')
  assertByteLength(signerBytes, 20, 'Signer address')

  const chainflipExtrinsic = {
    call: toHexBytes(encodedCallHex),
    transactionMetadata: {
      nonce: transactionMetadata.nonce,
      expiryBlock: transactionMetadata.expiryBlock,
    },
  }

  const signatureData = {
    tag: 'Ethereum',
    value: {
      signature: signatureBytes,
      signer: signerBytes,
      sigType: {
        tag: signature.sigType ?? 'Eip712',
        value: undefined,
      },
    },
  } as const

  const callBytes = runtimeCallCodec.enc({
    tag: 'Environment',
    value: {
      tag: 'NonNativeSignedCall',
      value: {
        chainflipExtrinsic,
        signatureData,
      },
    },
  })

  const versioned = new Uint8Array([0x04, ...callBytes])
  const lengthPrefix = Bytes().enc(versioned)
  return bytesToHex(lengthPrefix)
}

const toAddressBytes = (address: ChainflipEncodedAddress): Uint8Array => {
  if (address.address instanceof Uint8Array) return address.address

  switch (address.chain) {
    case 'Ethereum':
    case 'Arbitrum':
      return toHexBytes(address.address)
    case 'Solana':
      return bs58.decode(address.address)
    case 'Bitcoin':
      return new TextEncoder().encode(address.address)
    case 'Polkadot':
    case 'Assethub':
      return toHexBytes(address.address)
    default:
      return toHexBytes(address.address)
  }
}

const buildEncodedAddressValue = (address: ChainflipEncodedAddress) => {
  const addressBytes = toAddressBytes(address)
  switch (address.chain) {
    case 'Ethereum':
      assertByteLength(addressBytes, 20, 'Ethereum address')
      return { tag: 'Eth' as const, value: addressBytes }
    case 'Polkadot':
      assertByteLength(addressBytes, 32, 'Polkadot address')
      return { tag: 'Dot' as const, value: addressBytes }
    case 'Bitcoin':
      return { tag: 'Btc' as const, value: addressBytes }
    case 'Arbitrum':
      assertByteLength(addressBytes, 20, 'Arbitrum address')
      return { tag: 'Arb' as const, value: addressBytes }
    case 'Solana':
      assertByteLength(addressBytes, 32, 'Solana address')
      return { tag: 'Sol' as const, value: addressBytes }
    case 'Assethub':
      assertByteLength(addressBytes, 32, 'Assethub address')
      return { tag: 'Hub' as const, value: addressBytes }
    default:
      throw new Error('Unsupported encoded address chain')
  }
}
