import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import { ASSET_REFERENCE, starknetAssetId, starknetChainId, toAssetId } from '@shapeshiftoss/caip'
import type { HDWallet, StarknetWallet } from '@shapeshiftoss/hdwallet-core'
import { supportsStarknet } from '@shapeshiftoss/hdwallet-core'
import type { Bip44Params, RootBip44Params } from '@shapeshiftoss/types'
import { KnownChainIds } from '@shapeshiftoss/types'
import { TransferType, TxStatus } from '@shapeshiftoss/unchained-client'
import { bnOrZero } from '@shapeshiftoss/utils'
import PQueue from 'p-queue'
import type { Call } from 'starknet'
import { CallData, hash, num, RpcProvider, validateAndParseAddress } from 'starknet'

import type { ChainAdapter as IChainAdapter } from '../api'
import { ChainAdapterError, ErrorHandler } from '../error/ErrorHandler'
import type {
  Account,
  BroadcastTransactionInput,
  BuildSendApiTxInput,
  BuildSendTxInput,
  FeeDataEstimate,
  GetAddressInput,
  GetBip44ParamsInput,
  GetFeeDataInput,
  SignAndBroadcastTransactionInput,
  SignTx,
  SignTxInput,
  Transaction,
  ValidAddressResult,
} from '../types'
import { ChainAdapterDisplayName, ValidAddressResultType } from '../types'
import { toAddressNList } from '../utils'
import type {
  RpcJsonResponse,
  SignTxWithDetails,
  StarknetBlockResult,
  StarknetFeeEstimate,
  StarknetNonceResult,
  StarknetReceipt,
  StarknetTransfer,
  StarknetTxHashResult,
  TokenInfo,
  TxHashOrObject,
} from './types'

export interface ChainAdapterArgs {
  rpcUrl: string
  getKnownTokens?: () => TokenInfo[]
}

// STRK token contract address on Starknet mainnet (native gas token)
const STRK_TOKEN_ADDRESS = '0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d'

// OpenZeppelin account contract class hash - same as used in hdwallet
const OPENZEPPELIN_ACCOUNT_CLASS_HASH =
  '0x05b4b537eaa2399e3aa99c4e2e0208ebd6c71bc1467938cd52c798c601e43564'

// Static fee estimates for undeployed accounts
// Used as fallback when RPC estimation fails
// These match typical Starknet transaction costs (account deployment costs ~0.001-0.01 STRK)
const STATIC_FEE_ESTIMATES = {
  l1GasConsumed: '0x186a0', // 100,000
  l1GasPrice: '0x5f5e100', // 100 gwei
  l2GasConsumed: '0x0',
  l2GasPrice: '0x0',
  l1DataGasConsumed: '0x186a0', // 100,000
  l1DataGasPrice: '0x1', // 1 wei
}

const calculateFeeTiers = (params: {
  l1GasConsumed: string
  l1GasPrice: string
  l2GasConsumed: string
  l2GasPrice: string
  l1DataGasConsumed: string
  l1DataGasPrice: string
}): FeeDataEstimate<KnownChainIds.StarknetMainnet> => {
  const {
    l1GasConsumed,
    l1GasPrice,
    l2GasConsumed,
    l2GasPrice,
    l1DataGasConsumed,
    l1DataGasPrice,
  } = params

  const baseFee = bnOrZero(l1GasConsumed)
    .times(l1GasPrice)
    .plus(bnOrZero(l2GasConsumed).times(l2GasPrice))
    .plus(bnOrZero(l1DataGasConsumed).times(l1DataGasPrice))

  const slowMaxFee = bnOrZero(l1GasConsumed)
    .times(1.5)
    .times(bnOrZero(l1GasPrice).times(1.2))
    .plus(bnOrZero(l2GasConsumed).times(1.5).times(bnOrZero(l2GasPrice).times(1.2)))
    .plus(bnOrZero(l1DataGasConsumed).times(1.5).times(bnOrZero(l1DataGasPrice).times(1.2)))
    .toFixed(0)

  const averageMaxFee = bnOrZero(l1GasConsumed)
    .times(3)
    .times(bnOrZero(l1GasPrice).times(1.5))
    .plus(bnOrZero(l2GasConsumed).times(3).times(bnOrZero(l2GasPrice).times(1.5)))
    .plus(bnOrZero(l1DataGasConsumed).times(3).times(bnOrZero(l1DataGasPrice).times(1.5)))
    .toFixed(0)

  const fastMaxFee = bnOrZero(l1GasConsumed)
    .times(5)
    .times(bnOrZero(l1GasPrice).times(2))
    .plus(bnOrZero(l2GasConsumed).times(5).times(bnOrZero(l2GasPrice).times(2)))
    .plus(bnOrZero(l1DataGasConsumed).times(5).times(bnOrZero(l1DataGasPrice).times(2)))
    .toFixed(0)

  return {
    slow: {
      txFee: baseFee.times(1.8).toFixed(0),
      chainSpecific: { maxFee: slowMaxFee },
    },
    average: {
      txFee: baseFee.times(4.5).toFixed(0),
      chainSpecific: { maxFee: averageMaxFee },
    },
    fast: {
      txFee: baseFee.times(10).toFixed(0),
      chainSpecific: { maxFee: fastMaxFee },
    },
  }
}

export class ChainAdapter implements IChainAdapter<KnownChainIds.StarknetMainnet> {
  static readonly rootBip44Params: RootBip44Params = {
    purpose: 44,
    coinType: Number(ASSET_REFERENCE.Starknet),
    accountNumber: 0,
  }

  protected readonly chainId = starknetChainId
  protected readonly assetId = starknetAssetId

  protected provider: RpcProvider
  protected batchedProvider: RpcProvider
  protected getKnownTokens: () => TokenInfo[]
  private requestQueue: PQueue

  constructor(args: ChainAdapterArgs) {
    // Main provider - NO batching for single RPC calls (getChainId, getTransactionReceipt, etc.)
    // IMPORTANT: Do NOT enable automatic batch mode (batch: 0) as it breaks single RPC calls
    // by making starknet.js expect batched array responses
    this.provider = new RpcProvider({ nodeUrl: args.rpcUrl })

    // Batched provider - ONLY for parallel balance queries in getAccount()
    // batch: 0 enables automatic batching for concurrent callContract calls
    this.batchedProvider = new RpcProvider({ nodeUrl: args.rpcUrl, batch: 0 })

    // Default to empty token list if not provided - avoids race condition with asset service initialization
    this.getKnownTokens = args.getKnownTokens ?? (() => [])
    // Rate limit batch requests to avoid overwhelming the RPC endpoint
    this.requestQueue = new PQueue({
      intervalCap: 1,
      interval: 100, // 1 batch request every 100ms
      concurrency: 1,
    })
  }

  private assertSupportsChain(wallet: HDWallet): asserts wallet is StarknetWallet {
    if (!supportsStarknet(wallet)) {
      throw new ChainAdapterError(`wallet does not support: ${this.getDisplayName()}`, {
        translation: 'chainAdapters.errors.unsupportedChain',
        options: { chain: this.getDisplayName() },
      })
    }
  }

  getName() {
    return 'Starknet'
  }

  getDisplayName() {
    return ChainAdapterDisplayName.Starknet
  }

  getType(): KnownChainIds.StarknetMainnet {
    return KnownChainIds.StarknetMainnet
  }

  getFeeAssetId(): AssetId {
    return this.assetId
  }

  getChainId(): ChainId {
    return this.chainId
  }

  getBip44Params({ accountNumber }: GetBip44ParamsInput): Bip44Params {
    if (accountNumber < 0) throw new Error('accountNumber must be >= 0')
    return {
      ...ChainAdapter.rootBip44Params,
      accountNumber,
      isChange: false,
      addressIndex: 0,
    }
  }

  async getAddress(input: GetAddressInput): Promise<string> {
    try {
      const { accountNumber, pubKey, wallet, showOnDevice = false } = input

      if (pubKey) return pubKey

      if (!wallet) throw new Error('wallet is required')
      this.assertSupportsChain(wallet)

      // TODO: Re-enable once Starknet is added to verifyLedgerAppOpen
      // await verifyLedgerAppOpen(this.chainId, wallet)

      const address = await wallet.starknetGetAddress({
        addressNList: toAddressNList(this.getBip44Params({ accountNumber })),
        showDisplay: showOnDevice,
      })

      if (!address) throw new Error('error getting address from wallet')

      return address
    } catch (err) {
      return ErrorHandler(err, {
        translation: 'chainAdapters.errors.getAddress',
      })
    }
  }

  async getAccount(pubkey: string): Promise<Account<KnownChainIds.StarknetMainnet>> {
    try {
      // Normalize the address to ensure consistent format
      const normalizedAddress = validateAndParseAddress(pubkey)

      // Get known tokens at runtime - avoids race condition with asset service initialization
      const knownTokens = this.getKnownTokens()

      // Prepare balance queries for STRK + all known tokens
      const allTokenAddresses = [STRK_TOKEN_ADDRESS, ...knownTokens.map(t => t.contractAddress)]

      // Process balance queries in batches to avoid timeout issues
      // Batch size of 50 provides good balance between performance and reliability
      const BATCH_SIZE = 50
      const results: string[][] = []

      for (let i = 0; i < allTokenAddresses.length; i += BATCH_SIZE) {
        const batch = allTokenAddresses.slice(i, i + BATCH_SIZE)
        // Wrap the entire batch in a single queue operation
        // The batchedProvider (with batch: 0) will automatically batch all concurrent callContract calls
        // into a single JSON-RPC request, avoiding RPC spamming
        const batchResults = await this.requestQueue.add(() =>
          Promise.all(
            batch.map(tokenAddress => {
              const calldata = [normalizedAddress]
              return this.batchedProvider
                .callContract({
                  contractAddress: tokenAddress,
                  entrypoint: 'balanceOf',
                  calldata,
                })
                .catch(() => {
                  // Return zero balance if call fails (e.g., account not deployed, token doesn't exist)
                  return ['0x0', '0x0']
                })
            }),
          ),
        )
        results.push(...batchResults)
      }

      // Parse balances from results
      const tokenBalances: Map<string, { balance: string; info?: TokenInfo }> = new Map()

      results.forEach((result, idx) => {
        if (result && Array.isArray(result)) {
          // Balance is returned as Uint256 (low, high)
          const low = BigInt(result[0] ?? '0x0')
          const high = BigInt(result[1] ?? '0x0')
          const balance = low + (high << BigInt(128))

          const tokenAddress = allTokenAddresses[idx]

          if (balance > BigInt(0)) {
            // Find token info if it's not STRK (STRK is first, so idx > 0 means it's from knownTokens)
            const tokenInfo = idx > 0 ? knownTokens[idx - 1] : undefined
            tokenBalances.set(tokenAddress, {
              balance: balance.toString(),
              info: tokenInfo,
            })
          }
        }
      })

      // Extract native STRK balance
      const nativeBalance = tokenBalances.get(STRK_TOKEN_ADDRESS)?.balance ?? '0'
      tokenBalances.delete(STRK_TOKEN_ADDRESS) // Remove STRK from tokens list as it's the native balance

      // Build tokens array for non-zero balances (excluding STRK)
      const tokens: {
        assetId: AssetId
        balance: string
        symbol: string
        name: string
        precision: number
      }[] = Array.from(tokenBalances.values()).map(({ balance, info }) => {
        if (info) {
          // Use info from asset service
          return {
            assetId: info.assetId,
            balance,
            symbol: info.symbol,
            name: info.name,
            precision: info.precision,
          }
        }
        // Fallback for unknown tokens (shouldn't happen with getKnownTokens, but defensive)
        return {
          assetId: '' as AssetId,
          balance,
          symbol: '',
          name: '',
          precision: 18,
        }
      })

      return {
        balance: nativeBalance,
        chainId: this.chainId,
        assetId: this.assetId,
        chain: this.getType(),
        chainSpecific: {
          tokens: tokens.filter(t => t.assetId !== ''), // Filter out any malformed tokens
        },
        pubkey,
      }
    } catch (err) {
      return ErrorHandler(err, {
        translation: 'chainAdapters.errors.getAccount',
        options: { pubkey },
      })
    }
  }

  validateAddress(address: string): Promise<ValidAddressResult> {
    try {
      validateAndParseAddress(address)
      return Promise.resolve({
        valid: true,
        result: ValidAddressResultType.Valid,
      })
    } catch (err) {
      return Promise.resolve({
        valid: false,
        result: ValidAddressResultType.Invalid,
      })
    }
  }

  getStarknetProvider(): RpcProvider {
    return this.provider
  }

  /**
   * Check if an account is deployed on Starknet
   * An account is considered deployed if it has code (class hash)
   */
  async isAccountDeployed(address: string): Promise<boolean> {
    try {
      // Try to get nonce - if account is deployed, it will have a nonce
      // If not deployed, this will return error
      const response = await this.provider.fetch('starknet_getNonce', ['latest', address])
      const result: RpcJsonResponse<StarknetNonceResult> = await response.json()

      // If we get an error, account is not deployed
      if (result.error) {
        // Error code 20 = CONTRACT_NOT_FOUND means not deployed
        return false
      }

      // If we got a nonce, account is deployed
      return true
    } catch (error) {
      return false
    }
  }

  /**
   * Get the nonce for an account
   * Returns '0x0' if account is not deployed, otherwise fetches the nonce from RPC
   */
  async getNonce(address: string): Promise<string> {
    const isDeployed = await this.isAccountDeployed(address)

    if (!isDeployed) return '0x0'

    const nonceResponse = await this.provider.fetch('starknet_getNonce', ['pending', address])
    const nonceResult: RpcJsonResponse<StarknetNonceResult> = await nonceResponse.json()
    if (!nonceResult.result) throw new Error('Failed to fetch nonce')

    return nonceResult.result
  }

  /**
   * Get fee data for deploying a Starknet account contract
   * This estimates fees for the DEPLOY_ACCOUNT transaction type
   */
  async getDeployAccountFeeData(input: {
    accountNumber: number
    wallet: HDWallet
  }): Promise<FeeDataEstimate<KnownChainIds.StarknetMainnet>> {
    try {
      const { accountNumber, wallet } = input

      this.assertSupportsChain(wallet)

      const address = await this.getAddress({ accountNumber, wallet })
      const isDeployed = await this.isAccountDeployed(address)

      const publicKey = await wallet.starknetGetPublicKey({
        addressNList: toAddressNList(this.getBip44Params({ accountNumber })),
      })

      if (!publicKey) {
        throw new Error('error getting public key from wallet')
      }

      const constructorCalldata = CallData.compile([publicKey])
      const salt = publicKey
      const version = '0x3' as const
      const nonce = '0x0'

      const formattedCalldata = constructorCalldata.map((data: string) => {
        if (!data.startsWith('0x')) {
          return num.toHex(data)
        }
        return data
      })

      const formattedSalt = salt.startsWith('0x') ? salt : `0x${salt}`

      if (!isDeployed) {
        const estimateTx = {
          type: 'DEPLOY_ACCOUNT',
          version,
          signature: [],
          nonce,
          contract_address_salt: formattedSalt,
          constructor_calldata: formattedCalldata,
          class_hash: OPENZEPPELIN_ACCOUNT_CLASS_HASH,
          resource_bounds: {
            l1_gas: { max_amount: '0x186a0', max_price_per_unit: '0x5f5e100' },
            l2_gas: { max_amount: '0x0', max_price_per_unit: '0x0' },
            l1_data_gas: { max_amount: '0x186a0', max_price_per_unit: '0x1' },
          },
          tip: '0x0',
          paymaster_data: [],
          nonce_data_availability_mode: 'L1',
          fee_data_availability_mode: 'L1',
        }

        try {
          const estimateResponse = await this.provider.fetch('starknet_estimateFee', [
            [estimateTx],
            ['SKIP_VALIDATE'],
            'latest',
          ])
          const estimateResult: RpcJsonResponse<StarknetFeeEstimate[]> =
            await estimateResponse.json()

          if (!estimateResult.error && estimateResult.result?.[0]) {
            const feeEstimate = estimateResult.result[0]
            console.log(
              '[StarknetChainAdapter.getDeployAccountFeeData] RPC estimate for undeployed account:',
              feeEstimate,
            )
            return calculateFeeTiers({
              l1GasConsumed: feeEstimate.l1_gas_consumed ?? '0x186a0',
              l1GasPrice: feeEstimate.l1_gas_price ?? '0x5f5e100',
              l2GasConsumed: feeEstimate.l2_gas_consumed ?? '0x0',
              l2GasPrice: feeEstimate.l2_gas_price ?? '0x0',
              l1DataGasConsumed: feeEstimate.l1_data_gas_consumed ?? '0x186a0',
              l1DataGasPrice: feeEstimate.l1_data_gas_price ?? '0x1',
            })
          }
        } catch (error) {
          console.log(
            '[StarknetChainAdapter.getDeployAccountFeeData] RPC estimation failed for undeployed account, using static estimates:',
            error,
          )
        }

        console.log(
          '[StarknetChainAdapter.getDeployAccountFeeData] Using static estimates for undeployed account',
        )
        return calculateFeeTiers(STATIC_FEE_ESTIMATES)
      }

      const estimateTx = {
        type: 'DEPLOY_ACCOUNT',
        version,
        signature: [],
        nonce,
        contract_address_salt: formattedSalt,
        constructor_calldata: formattedCalldata,
        class_hash: OPENZEPPELIN_ACCOUNT_CLASS_HASH,
        resource_bounds: {
          l1_gas: { max_amount: '0x186a0', max_price_per_unit: '0x5f5e100' },
          l2_gas: { max_amount: '0x0', max_price_per_unit: '0x0' },
          l1_data_gas: { max_amount: '0x186a0', max_price_per_unit: '0x1' },
        },
        tip: '0x0',
        paymaster_data: [],
        nonce_data_availability_mode: 'L1',
        fee_data_availability_mode: 'L1',
      }

      const estimateResponse = await this.provider.fetch('starknet_estimateFee', [
        [estimateTx],
        ['SKIP_VALIDATE'],
        'latest',
      ])
      const estimateResult: RpcJsonResponse<StarknetFeeEstimate[]> = await estimateResponse.json()

      if (estimateResult.error) {
        const errorMessage = estimateResult.error.message || JSON.stringify(estimateResult.error)
        throw new Error(`Fee estimation failed: ${errorMessage}`)
      }

      const feeEstimate = estimateResult.result?.[0]
      if (!feeEstimate) {
        throw new Error('Fee estimation failed: no estimate returned')
      }

      return calculateFeeTiers({
        l1GasConsumed: feeEstimate.l1_gas_consumed ?? '0x186a0',
        l1GasPrice: feeEstimate.l1_gas_price ?? '0x5f5e100',
        l2GasConsumed: feeEstimate.l2_gas_consumed ?? '0x0',
        l2GasPrice: feeEstimate.l2_gas_price ?? '0x0',
        l1DataGasConsumed: feeEstimate.l1_data_gas_consumed ?? '0x186a0',
        l1DataGasPrice: feeEstimate.l1_data_gas_price ?? '0x1',
      })
    } catch (err) {
      return ErrorHandler(err, {
        translation: 'chainAdapters.errors.getFeeData',
      })
    }
  }

  /**
   * Deploy a Starknet account contract
   * This must be done before an account can send transactions
   */
  async deployAccount(input: {
    accountNumber: number
    wallet: HDWallet
    maxFee: string
  }): Promise<string> {
    try {
      const { accountNumber, wallet } = input

      this.assertSupportsChain(wallet)

      const address = await this.getAddress({ accountNumber, wallet })

      const publicKey = await wallet.starknetGetPublicKey({
        addressNList: toAddressNList(this.getBip44Params({ accountNumber })),
      })

      if (!publicKey) {
        throw new Error('error getting public key from wallet')
      }

      const isDeployed = await this.isAccountDeployed(address)
      if (isDeployed) {
        throw new Error('Account is already deployed')
      }

      const chainIdHex = await this.provider.getChainId()

      const constructorCalldata = CallData.compile([publicKey])
      const salt = publicKey
      const version = '0x3' as const // Use v3 for Lava RPC
      const nonce = '0x0'

      // Format calldata - keep as-is from CallData.compile
      const formattedCalldata = constructorCalldata.map((data: string) => {
        if (!data.startsWith('0x')) {
          return num.toHex(data)
        }
        return data
      })

      const formattedSalt = salt.startsWith('0x') ? salt : `0x${salt}`

      const callResult: string[] = await this.provider.callContract({
        contractAddress: STRK_TOKEN_ADDRESS,
        entrypoint: 'balanceOf',
        calldata: [address],
      })

      const low = BigInt(callResult[0] ?? '0x0')
      const high = BigInt(callResult[1] ?? '0x0')
      const balance = low + (high << BigInt(128))

      let resourceBounds: {
        l1_gas: { max_amount: bigint; max_price_per_unit: bigint }
        l2_gas: { max_amount: bigint; max_price_per_unit: bigint }
        l1_data_gas: { max_amount: bigint; max_price_per_unit: bigint }
      }

      const estimateTx = {
        type: 'DEPLOY_ACCOUNT',
        version,
        signature: [],
        nonce,
        contract_address_salt: formattedSalt,
        constructor_calldata: formattedCalldata,
        class_hash: OPENZEPPELIN_ACCOUNT_CLASS_HASH,
        resource_bounds: {
          l1_gas: { max_amount: '0x186a0', max_price_per_unit: '0x5f5e100' },
          l2_gas: { max_amount: '0x0', max_price_per_unit: '0x0' },
          l1_data_gas: { max_amount: '0x186a0', max_price_per_unit: '0x1' },
        },
        tip: '0x0',
        paymaster_data: [],
        nonce_data_availability_mode: 'L1',
        fee_data_availability_mode: 'L1',
      }

      try {
        const estimateResponse = await this.provider.fetch('starknet_estimateFee', [
          [estimateTx],
          ['SKIP_VALIDATE'],
          'latest',
        ])
        const estimateResult: RpcJsonResponse<StarknetFeeEstimate[]> = await estimateResponse.json()

        if (!estimateResult.error && estimateResult.result?.[0]) {
          const feeEstimate = estimateResult.result[0]
          console.log('[StarknetChainAdapter.deployAccount] Using RPC estimate:', feeEstimate)

          resourceBounds = {
            l1_gas: {
              max_amount:
                (BigInt(feeEstimate.l1_gas_consumed ?? '0x186a0') * BigInt(150)) / BigInt(100),
              max_price_per_unit:
                (BigInt(feeEstimate.l1_gas_price ?? '0x5f5e100') * BigInt(150)) / BigInt(100),
            },
            l2_gas: {
              max_amount:
                (BigInt(feeEstimate.l2_gas_consumed ?? '0x0') * BigInt(150)) / BigInt(100),
              max_price_per_unit:
                (BigInt(feeEstimate.l2_gas_price ?? '0x0') * BigInt(150)) / BigInt(100),
            },
            l1_data_gas: {
              max_amount:
                (BigInt(feeEstimate.l1_data_gas_consumed ?? '0x186a0') * BigInt(150)) / BigInt(100),
              max_price_per_unit:
                (BigInt(feeEstimate.l1_data_gas_price ?? '0x1') * BigInt(150)) / BigInt(100),
            },
          }
        } else {
          throw new Error('RPC estimation failed or returned empty result')
        }
      } catch (error) {
        console.log(
          '[StarknetChainAdapter.deployAccount] RPC estimation failed, using static estimates:',
          error,
        )

        const {
          l1GasConsumed,
          l1GasPrice,
          l2GasConsumed,
          l2GasPrice,
          l1DataGasConsumed,
          l1DataGasPrice,
        } = STATIC_FEE_ESTIMATES

        resourceBounds = {
          l1_gas: {
            max_amount: BigInt(bnOrZero(l1GasConsumed).times(1.5).toFixed(0)),
            max_price_per_unit: BigInt(bnOrZero(l1GasPrice).times(1.5).toFixed(0)),
          },
          l2_gas: {
            max_amount: BigInt(bnOrZero(l2GasConsumed).times(1.5).toFixed(0)),
            max_price_per_unit: BigInt(bnOrZero(l2GasPrice).times(1.5).toFixed(0)),
          },
          l1_data_gas: {
            max_amount: BigInt(bnOrZero(l1DataGasConsumed).times(1.5).toFixed(0)),
            max_price_per_unit: BigInt(bnOrZero(l1DataGasPrice).times(1.5).toFixed(0)),
          },
        }
      }

      const totalMaxFee =
        resourceBounds.l1_gas.max_amount * resourceBounds.l1_gas.max_price_per_unit +
        resourceBounds.l2_gas.max_amount * resourceBounds.l2_gas.max_price_per_unit +
        resourceBounds.l1_data_gas.max_amount * resourceBounds.l1_data_gas.max_price_per_unit

      console.log('[StarknetChainAdapter.deployAccount] Balance check:', {
        address,
        balance: balance.toString(),
        totalMaxFee: totalMaxFee.toString(),
        hasEnoughBalance: balance >= totalMaxFee,
        resourceBounds: {
          l1_gas: {
            max_amount: resourceBounds.l1_gas.max_amount.toString(),
            max_price_per_unit: resourceBounds.l1_gas.max_price_per_unit.toString(),
          },
          l1_data_gas: {
            max_amount: resourceBounds.l1_data_gas.max_amount.toString(),
            max_price_per_unit: resourceBounds.l1_data_gas.max_price_per_unit.toString(),
          },
        },
      })

      if (balance < totalMaxFee) {
        throw new Error(
          `Insufficient STRK balance for deployment. Balance: ${balance.toString()}, Required: ${totalMaxFee.toString()}`,
        )
      }

      const hashInputs = {
        contractAddress: address,
        classHash: OPENZEPPELIN_ACCOUNT_CLASS_HASH,
        compiledConstructorCalldata: formattedCalldata,
        salt: formattedSalt,
        version,
        chainId: chainIdHex,
        nonce,
        nonceDataAvailabilityMode: 0 as const, // L1
        feeDataAvailabilityMode: 0 as const, // L1
        resourceBounds: {
          l1_gas: {
            max_amount: resourceBounds.l1_gas.max_amount,
            max_price_per_unit: resourceBounds.l1_gas.max_price_per_unit,
          },
          l2_gas: {
            max_amount: resourceBounds.l2_gas.max_amount,
            max_price_per_unit: resourceBounds.l2_gas.max_price_per_unit,
          },
          l1_data_gas: {
            max_amount: resourceBounds.l1_data_gas.max_amount,
            max_price_per_unit: resourceBounds.l1_data_gas.max_price_per_unit,
          },
        },
        tip: '0x0',
        paymasterData: [],
      }

      // Use starknet.js calculateDeployAccountTransactionHash which internally uses hashFeeFieldV3B3
      // This includes l1_data_gas in the fee hash (required since starknet.js v9)
      // See: https://github.com/starknet-io/starknet.js/blob/v9.3.0/src/utils/hash/transactionHash/v3.ts#L63-L68
      const txHash = hash.calculateDeployAccountTransactionHash(hashInputs)

      const signatureResult = await wallet.starknetSignTx({
        addressNList: toAddressNList(this.getBip44Params({ accountNumber })),
        txHash, // Already in hex format from calculateDeployAccountTransactionHash
      })

      if (!signatureResult?.signature) {
        throw new Error('error signing deploy account transaction')
      }

      // Use signatures as-is from the wallet (no padding)
      const formattedSignature = signatureResult.signature.map((sig: string) => {
        if (!sig.startsWith('0x')) {
          return `0x${sig}`
        }
        return sig
      })

      // Convert bigint resource bounds to hex strings for RPC
      const deployAccountTx = {
        type: 'DEPLOY_ACCOUNT',
        version,
        signature: formattedSignature,
        nonce,
        contract_address_salt: formattedSalt,
        constructor_calldata: formattedCalldata,
        class_hash: OPENZEPPELIN_ACCOUNT_CLASS_HASH,
        resource_bounds: {
          l1_gas: {
            max_amount: num.toHex(resourceBounds.l1_gas.max_amount),
            max_price_per_unit: num.toHex(resourceBounds.l1_gas.max_price_per_unit),
          },
          l2_gas: {
            max_amount: num.toHex(resourceBounds.l2_gas.max_amount),
            max_price_per_unit: num.toHex(resourceBounds.l2_gas.max_price_per_unit),
          },
          l1_data_gas: {
            max_amount: num.toHex(resourceBounds.l1_data_gas.max_amount),
            max_price_per_unit: num.toHex(resourceBounds.l1_data_gas.max_price_per_unit),
          },
        },
        tip: '0x0',
        paymaster_data: [],
        nonce_data_availability_mode: 'L1', // RPC expects "L1" or "L2"
        fee_data_availability_mode: 'L1',
      }

      const response = await this.provider.fetch('starknet_addDeployAccountTransaction', [
        deployAccountTx,
      ])
      const result: RpcJsonResponse<StarknetTxHashResult> = await response.json()

      if (result.error) {
        throw new Error(`RPC error: ${result.error.message || JSON.stringify(result.error)}`)
      }

      return result.result?.transaction_hash ?? ''
    } catch (err) {
      return ErrorHandler(err, {
        translation: 'chainAdapters.errors.deployAccount',
      })
    }
  }

  getTxHistory(): Promise<never> {
    throw new Error('Starknet transaction history not yet implemented')
  }

  async buildSendApiTransaction(
    input: BuildSendApiTxInput<KnownChainIds.StarknetMainnet>,
  ): Promise<SignTx<KnownChainIds.StarknetMainnet>> {
    try {
      const { from, to, value, chainSpecific, sendMax } = input
      let { tokenContractAddress } = chainSpecific

      // On Starknet, STRK is the native gas token but it's an ERC-20
      // If no token address is specified, use STRK token address
      if (!tokenContractAddress) {
        tokenContractAddress = STRK_TOKEN_ADDRESS
      }

      // Validate and normalize addresses
      const normalizedTo = validateAndParseAddress(to)

      let actualValue = value

      if (sendMax && tokenContractAddress === STRK_TOKEN_ADDRESS) {
        const callResult: string[] = await this.provider.callContract({
          contractAddress: tokenContractAddress,
          entrypoint: 'balanceOf',
          calldata: [from],
        })

        if (callResult && Array.isArray(callResult)) {
          const low = BigInt(callResult[0] ?? '0x0')
          const high = BigInt(callResult[1] ?? '0x0')
          const balance = low + (high << BigInt(128))

          const dummyUint256 = {
            low: balance & BigInt('0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF'),
            high: balance >> BigInt(128),
          }

          const dummyCall: Call = {
            contractAddress: tokenContractAddress,
            entrypoint: 'transfer',
            calldata: [normalizedTo, dummyUint256.low.toString(), dummyUint256.high.toString()],
          }

          const dummyCalldataArray = Array.isArray(dummyCall.calldata) ? dummyCall.calldata : []
          const dummyFullCalldata = [
            '1',
            dummyCall.contractAddress,
            hash.getSelectorFromName(dummyCall.entrypoint),
            dummyCalldataArray.length.toString(),
            ...dummyCalldataArray,
          ]

          const dummyFormattedCalldata = dummyFullCalldata.map(data => {
            if (typeof data === 'string' && !data.startsWith('0x')) {
              return num.toHex(data)
            }
            return data.toString()
          })

          // Get nonce for fee estimation (account is already confirmed deployed)
          const nonceResponse = await this.provider.fetch('starknet_getNonce', ['pending', from])
          const nonceResult: RpcJsonResponse<StarknetNonceResult> = await nonceResponse.json()
          const nonce = nonceResult.result || '0x0'

          const estimateTx = {
            type: 'INVOKE',
            version: '0x3',
            sender_address: from,
            calldata: dummyFormattedCalldata,
            signature: [],
            nonce,
            resource_bounds: {
              l1_gas: {
                max_amount: '0x186a0',
                max_price_per_unit: '0x5f5e100',
              },
              l2_gas: { max_amount: '0x0', max_price_per_unit: '0x0' },
              l1_data_gas: { max_amount: '0x186a0', max_price_per_unit: '0x1' },
            },
            tip: '0x0',
            paymaster_data: [],
            account_deployment_data: [],
            nonce_data_availability_mode: 'L1',
            fee_data_availability_mode: 'L1',
          }

          const estimateResponse = await this.provider.fetch('starknet_estimateFee', [
            [estimateTx],
            ['SKIP_VALIDATE'],
            'latest',
          ])
          const estimateResult: RpcJsonResponse<StarknetFeeEstimate[]> =
            await estimateResponse.json()

          if (!estimateResult.error && estimateResult.result?.[0]) {
            const feeEstimate = estimateResult.result[0]
            const l1GasConsumed = feeEstimate.l1_gas_consumed
              ? BigInt(feeEstimate.l1_gas_consumed)
              : BigInt('0x186a0')
            const l1GasPrice = feeEstimate.l1_gas_price
              ? BigInt(feeEstimate.l1_gas_price)
              : BigInt('0x5f5e100')
            const l2GasConsumed = feeEstimate.l2_gas_consumed
              ? BigInt(feeEstimate.l2_gas_consumed)
              : BigInt('0x0')
            const l2GasPrice = feeEstimate.l2_gas_price
              ? BigInt(feeEstimate.l2_gas_price)
              : BigInt('0x0')
            const l1DataGasConsumed = feeEstimate.l1_data_gas_consumed
              ? BigInt(feeEstimate.l1_data_gas_consumed)
              : BigInt('0x186a0')
            const l1DataGasPrice = feeEstimate.l1_data_gas_price
              ? BigInt(feeEstimate.l1_data_gas_price)
              : BigInt('0x1')

            const maxFeeNeeded =
              ((l1GasConsumed * BigInt(500)) / BigInt(100)) *
                ((l1GasPrice * BigInt(200)) / BigInt(100)) +
              ((l2GasConsumed * BigInt(500)) / BigInt(100)) *
                ((l2GasPrice * BigInt(200)) / BigInt(100)) +
              ((l1DataGasConsumed * BigInt(500)) / BigInt(100)) *
                ((l1DataGasPrice * BigInt(200)) / BigInt(100))

            const maxSendableAmount = balance > maxFeeNeeded ? balance - maxFeeNeeded : BigInt(0)

            actualValue = maxSendableAmount.toString()
          }
        }
      }

      // All transfers on Starknet go through token contracts (ERC-20)
      const uint256Value = {
        low: BigInt(actualValue) & BigInt('0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF'),
        high: BigInt(actualValue) >> BigInt(128),
      }

      const call: Call = {
        contractAddress: tokenContractAddress,
        entrypoint: 'transfer',
        calldata: [normalizedTo, uint256Value.low.toString(), uint256Value.high.toString()],
      }

      // Get account nonce - use '0x0' for undeployed accounts
      let nonce = '0x0'
      try {
        const nonceResponse = await this.provider.fetch('starknet_getNonce', ['pending', from])
        const nonceResult: RpcJsonResponse<StarknetNonceResult> = await nonceResponse.json()
        if (!nonceResult.error && nonceResult.result) {
          nonce = nonceResult.result
        }
      } catch (error) {
        // If nonce fetch fails (e.g., account not deployed, method not supported), use '0x0'
        nonce = '0x0'
      }

      const chainIdHex = await this.provider.getChainId()
      const version = '0x3' as const // Use v3 for Lava RPC

      // Build the invoke transaction calldata
      const calldataArray = Array.isArray(call.calldata) ? call.calldata : []
      const fullCalldata = [
        '1', // call array length
        call.contractAddress,
        hash.getSelectorFromName(call.entrypoint),
        calldataArray.length.toString(),
        ...calldataArray,
      ]

      // Format calldata for RPC
      const formattedCalldata = fullCalldata.map(data => {
        if (typeof data === 'string' && !data.startsWith('0x')) {
          return num.toHex(data)
        }
        return data.toString()
      })

      // Estimate fees for v3 transaction
      const estimateTx = {
        type: 'INVOKE',
        version,
        sender_address: from,
        calldata: formattedCalldata,
        signature: [],
        nonce,
        resource_bounds: {
          l1_gas: { max_amount: '0x186a0', max_price_per_unit: '0x5f5e100' },
          l2_gas: { max_amount: '0x0', max_price_per_unit: '0x0' },
          l1_data_gas: { max_amount: '0x186a0', max_price_per_unit: '0x1' },
        },
        tip: '0x0',
        paymaster_data: [],
        account_deployment_data: [],
        nonce_data_availability_mode: 'L1',
        fee_data_availability_mode: 'L1',
      }

      const estimateResponse = await this.provider.fetch('starknet_estimateFee', [
        [estimateTx],
        ['SKIP_VALIDATE'],
        'latest',
      ])
      const estimateResult: RpcJsonResponse<StarknetFeeEstimate[]> = await estimateResponse.json()

      if (estimateResult.error) {
        throw new Error(`Fee estimation failed: ${estimateResult.error.message}`)
      }

      const feeEstimate = estimateResult.result?.[0]
      if (!feeEstimate) {
        throw new Error('Fee estimation failed: no estimate returned')
      }

      const l1GasConsumed = feeEstimate.l1_gas_consumed
        ? BigInt(feeEstimate.l1_gas_consumed)
        : BigInt('0x186a0')
      const l1GasPrice = feeEstimate.l1_gas_price
        ? BigInt(feeEstimate.l1_gas_price)
        : BigInt('0x5f5e100')
      const l2GasConsumed = feeEstimate.l2_gas_consumed
        ? BigInt(feeEstimate.l2_gas_consumed)
        : BigInt('0x0')
      const l2GasPrice = feeEstimate.l2_gas_price ? BigInt(feeEstimate.l2_gas_price) : BigInt('0x0')
      const l1DataGasConsumed = feeEstimate.l1_data_gas_consumed
        ? BigInt(feeEstimate.l1_data_gas_consumed)
        : BigInt('0x186a0')
      const l1DataGasPrice = feeEstimate.l1_data_gas_price
        ? BigInt(feeEstimate.l1_data_gas_price)
        : BigInt('0x1')

      const resourceBounds = {
        l1_gas: {
          max_amount: (l1GasConsumed * BigInt(500)) / BigInt(100),
          max_price_per_unit: (l1GasPrice * BigInt(200)) / BigInt(100),
        },
        l2_gas: {
          max_amount: (l2GasConsumed * BigInt(500)) / BigInt(100),
          max_price_per_unit: (l2GasPrice * BigInt(200)) / BigInt(100),
        },
        l1_data_gas: {
          max_amount: (l1DataGasConsumed * BigInt(500)) / BigInt(100),
          max_price_per_unit: (l1DataGasPrice * BigInt(200)) / BigInt(100),
        },
      }

      const invokeHashInputs = {
        senderAddress: from,
        version,
        compiledCalldata: formattedCalldata,
        chainId: chainIdHex,
        nonce,
        nonceDataAvailabilityMode: 0 as const, // L1
        feeDataAvailabilityMode: 0 as const, // L1
        resourceBounds: {
          l1_gas: {
            max_amount: resourceBounds.l1_gas.max_amount,
            max_price_per_unit: resourceBounds.l1_gas.max_price_per_unit,
          },
          l2_gas: {
            max_amount: resourceBounds.l2_gas.max_amount,
            max_price_per_unit: resourceBounds.l2_gas.max_price_per_unit,
          },
          l1_data_gas: {
            max_amount: resourceBounds.l1_data_gas.max_amount,
            max_price_per_unit: resourceBounds.l1_data_gas.max_price_per_unit,
          },
        },
        tip: '0x0',
        paymasterData: [],
        accountDeploymentData: [],
      }

      // Use starknet.js calculateInvokeTransactionHash which internally uses hashFeeFieldV3B3
      // This includes l1_data_gas in the fee hash (required since starknet.js v9)
      // See: https://github.com/starknet-io/starknet.js/blob/v9.3.0/src/utils/hash/transactionHash/v3.ts#L63-L68
      const txHash = hash.calculateInvokeTransactionHash(invokeHashInputs)

      // Return both the hash for signing and the full transaction details for broadcasting
      return {
        addressNList: toAddressNList(this.getBip44Params({ accountNumber: input.accountNumber })),
        txHash,
        _txDetails: {
          fromAddress: from,
          calldata: formattedCalldata,
          nonce,
          version,
          resourceBounds,
          chainId: chainIdHex,
          nonceDataAvailabilityMode: 0 as const,
          feeDataAvailabilityMode: 0 as const,
          tip: '0x0',
          paymasterData: [],
          accountDeploymentData: [],
        },
      } as SignTxWithDetails
    } catch (err) {
      return ErrorHandler(err, {
        translation: 'chainAdapters.errors.buildTransaction',
      })
    }
  }

  async buildSendTransaction(input: BuildSendTxInput<KnownChainIds.StarknetMainnet>): Promise<{
    txToSign: SignTx<KnownChainIds.StarknetMainnet>
  }> {
    try {
      const from = await this.getAddress(input)
      const txToSign = await this.buildSendApiTransaction({ ...input, from })

      return {
        txToSign: {
          ...txToSign,
          ...(input.pubKey ? { pubKey: input.pubKey } : {}),
        },
      }
    } catch (err) {
      return ErrorHandler(err, {
        translation: 'chainAdapters.errors.buildTransaction',
      })
    }
  }

  async signTransaction(
    signTxInput: SignTxInput<SignTx<KnownChainIds.StarknetMainnet>>,
  ): Promise<string> {
    try {
      const { txToSign, wallet } = signTxInput

      if (!wallet) throw new Error('wallet is required')
      this.assertSupportsChain(wallet)

      // TODO: Re-enable once Starknet is added to verifyLedgerAppOpen
      // await verifyLedgerAppOpen(this.chainId, wallet)

      // Extract just the signature fields for wallet signing
      const signatureResult = await wallet.starknetSignTx({
        addressNList: txToSign.addressNList,
        txHash: txToSign.txHash,
      })

      if (!signatureResult?.signature) {
        throw new Error('error signing tx - missing signature')
      }

      // Combine signature with transaction details for broadcasting
      const txWithDetails = txToSign as SignTxWithDetails
      const txDetails = txWithDetails._txDetails
      if (!txDetails) {
        throw new Error('transaction details not found')
      }

      // Format signature
      const formattedSignature = signatureResult.signature.map((sig: string) => {
        if (!sig.startsWith('0x')) {
          return `0x${sig}`
        }
        return sig
      })

      // Convert resourceBounds BigInt values to strings for JSON serialization
      const resourceBoundsForJson = {
        l1_gas: {
          max_amount: txDetails.resourceBounds.l1_gas.max_amount.toString(),
          max_price_per_unit: txDetails.resourceBounds.l1_gas.max_price_per_unit.toString(),
        },
        l2_gas: {
          max_amount: txDetails.resourceBounds.l2_gas.max_amount.toString(),
          max_price_per_unit: txDetails.resourceBounds.l2_gas.max_price_per_unit.toString(),
        },
        l1_data_gas: {
          max_amount: txDetails.resourceBounds.l1_data_gas.max_amount.toString(),
          max_price_per_unit: txDetails.resourceBounds.l1_data_gas.max_price_per_unit.toString(),
        },
      }

      // Build the complete signed v3 transaction for broadcasting
      const signedTransaction = {
        senderAddress: txDetails.fromAddress,
        calldata: txDetails.calldata,
        signature: formattedSignature,
        nonce: txDetails.nonce,
        version: txDetails.version,
        resourceBounds: resourceBoundsForJson,
      }

      return JSON.stringify(signedTransaction)
    } catch (err) {
      return ErrorHandler(err, {
        translation: 'chainAdapters.errors.signTransaction',
      })
    }
  }

  async signAndBroadcastTransaction({
    signTxInput,
  }: SignAndBroadcastTransactionInput<KnownChainIds.StarknetMainnet>): Promise<string> {
    try {
      const signedHex = await this.signTransaction(signTxInput)
      return await this.broadcastTransaction({
        hex: signedHex,
        senderAddress: '',
        receiverAddress: '',
      })
    } catch (err) {
      return ErrorHandler(err, {
        translation: 'chainAdapters.errors.signAndBroadcastTransaction',
      })
    }
  }

  async broadcastTransaction(input: BroadcastTransactionInput): Promise<string> {
    try {
      const { hex } = input
      const signedTx = JSON.parse(hex)

      // Build the v3 invoke transaction for RPC
      // Convert string values back to BigInt then to hex
      const invokeTransaction = {
        type: 'INVOKE',
        version: signedTx.version,
        sender_address: signedTx.senderAddress,
        calldata: signedTx.calldata,
        signature: signedTx.signature,
        nonce: signedTx.nonce,
        resource_bounds: {
          l1_gas: {
            max_amount: num.toHex(BigInt(signedTx.resourceBounds.l1_gas.max_amount)),
            max_price_per_unit: num.toHex(
              BigInt(signedTx.resourceBounds.l1_gas.max_price_per_unit),
            ),
          },
          l2_gas: {
            max_amount: num.toHex(BigInt(signedTx.resourceBounds.l2_gas.max_amount)),
            max_price_per_unit: num.toHex(
              BigInt(signedTx.resourceBounds.l2_gas.max_price_per_unit),
            ),
          },
          l1_data_gas: {
            max_amount: num.toHex(BigInt(signedTx.resourceBounds.l1_data_gas.max_amount)),
            max_price_per_unit: num.toHex(
              BigInt(signedTx.resourceBounds.l1_data_gas.max_price_per_unit),
            ),
          },
        },
        tip: '0x0',
        paymaster_data: [],
        account_deployment_data: [],
        nonce_data_availability_mode: 'L1',
        fee_data_availability_mode: 'L1',
      }

      const response = await this.provider.fetch('starknet_addInvokeTransaction', [
        invokeTransaction,
      ])
      const result: RpcJsonResponse<StarknetTxHashResult> = await response.json()

      if (result.error) {
        throw new Error(`RPC error: ${result.error.message || JSON.stringify(result.error)}`)
      }

      return result.result?.transaction_hash ?? ''
    } catch (err) {
      return ErrorHandler(err, {
        translation: 'chainAdapters.errors.broadcastTransaction',
      })
    }
  }

  async getFeeData(
    input: GetFeeDataInput<KnownChainIds.StarknetMainnet>,
  ): Promise<FeeDataEstimate<KnownChainIds.StarknetMainnet>> {
    try {
      const { to, value, chainSpecific } = input
      let { from, tokenContractAddress } = chainSpecific

      // Validate required parameters
      if (!from) {
        throw new Error('from address is required in chainSpecific')
      }
      if (!to) {
        throw new Error('to address is required')
      }
      if (!value) {
        throw new Error('value is required')
      }

      // On Starknet, STRK is the native gas token but it's an ERC-20
      // If no token address is specified, use STRK token address
      if (!tokenContractAddress) {
        tokenContractAddress = STRK_TOKEN_ADDRESS
      }

      // Validate and normalize addresses
      const normalizedTo = validateAndParseAddress(to)

      // Build the transfer call
      const uint256Value = {
        low: BigInt(value) & BigInt('0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF'),
        high: BigInt(value) >> BigInt(128),
      }

      const call: Call = {
        contractAddress: tokenContractAddress,
        entrypoint: 'transfer',
        calldata: [normalizedTo, uint256Value.low.toString(), uint256Value.high.toString()],
      }

      // Build the invoke transaction calldata for fee estimation
      const calldataArray = Array.isArray(call.calldata) ? call.calldata : []
      const fullCalldata = [
        '1', // call array length
        call.contractAddress,
        hash.getSelectorFromName(call.entrypoint),
        calldataArray.length.toString(),
        ...calldataArray,
      ]

      // Format calldata for RPC
      const formattedCalldata = fullCalldata.map(data => {
        if (typeof data === 'string' && !data.startsWith('0x')) {
          return num.toHex(data)
        }
        return data.toString()
      })

      const isDeployed = await this.isAccountDeployed(from)

      if (!isDeployed) {
        return calculateFeeTiers(STATIC_FEE_ESTIMATES)
      }

      const nonce = await this.getNonce(from)

      const estimateTx = {
        type: 'INVOKE',
        version: '0x3',
        sender_address: from,
        calldata: formattedCalldata,
        signature: [],
        nonce,
        resource_bounds: {
          l1_gas: { max_amount: '0x186a0', max_price_per_unit: '0x5f5e100' },
          l2_gas: { max_amount: '0x0', max_price_per_unit: '0x0' },
          l1_data_gas: { max_amount: '0x186a0', max_price_per_unit: '0x1' },
        },
        tip: '0x0',
        paymaster_data: [],
        account_deployment_data: [],
        nonce_data_availability_mode: 'L1',
        fee_data_availability_mode: 'L1',
      }

      const estimateResponse = await this.provider.fetch('starknet_estimateFee', [
        [estimateTx],
        ['SKIP_VALIDATE'],
        'latest',
      ])
      const estimateResult: RpcJsonResponse<StarknetFeeEstimate[]> = await estimateResponse.json()

      if (estimateResult.error) {
        const errorMessage = estimateResult.error.message || JSON.stringify(estimateResult.error)
        throw new Error(`Fee estimation failed: ${errorMessage}`)
      }

      const feeEstimate = estimateResult.result?.[0]
      if (!feeEstimate) {
        throw new Error('Fee estimation failed: no estimate returned')
      }

      return calculateFeeTiers({
        l1GasConsumed: feeEstimate.l1_gas_consumed ?? '0x186a0',
        l1GasPrice: feeEstimate.l1_gas_price ?? '0x5f5e100',
        l2GasConsumed: feeEstimate.l2_gas_consumed ?? '0x0',
        l2GasPrice: feeEstimate.l2_gas_price ?? '0x0',
        l1DataGasConsumed: feeEstimate.l1_data_gas_consumed ?? '0x186a0',
        l1DataGasPrice: feeEstimate.l1_data_gas_price ?? '0x1',
      })
    } catch (err) {
      return ErrorHandler(err, {
        translation: 'chainAdapters.errors.getFeeData',
      })
    }
  }

  subscribeTxs(): Promise<void> {
    return Promise.resolve()
  }

  unsubscribeTxs(): void {
    return
  }

  closeTxs(): void {
    return
  }

  async parseTx(txHashOrTx: TxHashOrObject, pubkey: string): Promise<Transaction> {
    try {
      const txHash = typeof txHashOrTx === 'string' ? txHashOrTx : txHashOrTx.transaction_hash

      // Use direct RPC call with error handling instead of getTransactionReceipt
      // This prevents throwing errors for pending transactions
      let receipt: StarknetReceipt | null = null
      try {
        receipt = (await this.provider.getTransactionReceipt(txHash)) as StarknetReceipt
      } catch (receiptError: unknown) {
        // If transaction is not found or still pending, return a pending transaction
        const errorMessage =
          receiptError instanceof Error ? receiptError.message : String(receiptError)
        if (
          errorMessage.includes('Transaction hash not found') ||
          errorMessage.includes('not found') ||
          errorMessage.includes('pending')
        ) {
          return {
            txid: txHash,
            blockHeight: -1,
            blockTime: 0,
            blockHash: '',
            chainId: this.chainId,
            confirmations: 0,
            status: TxStatus.Pending,
            transfers: [],
            pubkey,
          }
        }
        throw receiptError
      }

      // Handle case where receipt is null or undefined
      if (!receipt) {
        return {
          txid: txHash,
          blockHeight: -1,
          blockTime: 0,
          blockHash: '',
          chainId: this.chainId,
          confirmations: 0,
          status: TxStatus.Pending,
          transfers: [],
          pubkey,
        }
      }

      const status =
        receipt.execution_status === 'SUCCEEDED'
          ? TxStatus.Confirmed
          : receipt.execution_status === 'REVERTED'
          ? TxStatus.Failed
          : TxStatus.Unknown

      // Parse actual_fee from Starknet receipt
      // actual_fee is returned as an object with amount field in v3 receipts
      let feeValue = '0'
      if (receipt.actual_fee) {
        if (typeof receipt.actual_fee === 'object' && receipt.actual_fee.amount) {
          feeValue = String(receipt.actual_fee.amount)
        } else if (
          typeof receipt.actual_fee === 'string' ||
          typeof receipt.actual_fee === 'number'
        ) {
          feeValue = String(receipt.actual_fee)
        }
      }

      const fee =
        feeValue !== '0'
          ? {
              assetId: this.assetId,
              value: feeValue,
            }
          : undefined

      // Fetch block to get timestamp
      let blockTime = 0
      try {
        if (receipt.block_number && receipt.block_number !== 'pending') {
          const blockResponse = await this.provider.fetch('starknet_getBlockWithTxHashes', [
            { block_number: Number(receipt.block_number) },
          ])
          const blockResult: RpcJsonResponse<StarknetBlockResult> = await blockResponse.json()
          if (blockResult.result?.timestamp) {
            blockTime = Number(blockResult.result.timestamp)
          }
        }
      } catch (blockError) {
        // Ignore block timestamp fetch errors
      }

      let transfers: StarknetTransfer[] = []
      try {
        // Parse transfer events from receipt
        if (receipt.events && Array.isArray(receipt.events)) {
          const transferSelector = hash.getSelectorFromName('Transfer')

          for (const event of receipt.events) {
            // Check if this is a Transfer event
            if (event.keys && event.keys[0] === transferSelector) {
              try {
                // Starknet Transfer event structure:
                // keys: [selector]
                // data: [from, to, amount_low, amount_high]
                const fromAddress = event.data[0]
                const toAddress = event.data[1]
                const amountLow = event.data[2] ? BigInt(event.data[2]) : BigInt(0)
                const amountHigh = event.data[3] ? BigInt(event.data[3]) : BigInt(0)
                const amount = amountLow + (amountHigh << BigInt(128))

                // Determine asset ID from the event contract address
                const tokenAddress = event.from_address
                // Normalize addresses for comparison (Starknet addresses may have inconsistent padding)
                const normalizedTokenAddress = validateAndParseAddress(tokenAddress)
                const normalizedStrkAddress = validateAndParseAddress(STRK_TOKEN_ADDRESS)

                const assetId =
                  normalizedTokenAddress === normalizedStrkAddress
                    ? this.assetId
                    : toAssetId({
                        chainId: this.chainId,
                        assetNamespace: 'token',
                        assetReference: tokenAddress,
                      })

                // Normalize addresses for comparison (handles padding inconsistencies)
                const normalizedFrom = validateAndParseAddress(fromAddress)
                const normalizedTo = validateAndParseAddress(toAddress)
                const normalizedPubkey = validateAndParseAddress(pubkey)

                // Add send transfer if user is sender
                if (normalizedFrom === normalizedPubkey) {
                  transfers.push({
                    assetId,
                    from: [fromAddress],
                    to: [toAddress],
                    type: TransferType.Send,
                    value: amount.toString(),
                  })
                }

                // Add receive transfer if user is recipient
                if (normalizedTo === normalizedPubkey) {
                  transfers.push({
                    assetId,
                    from: [fromAddress],
                    to: [toAddress],
                    type: TransferType.Receive,
                    value: amount.toString(),
                  })
                }
              } catch (parseError) {
                console.error(
                  '[StarknetChainAdapter.parseTx] Error parsing transfer event:',
                  parseError,
                )
              }
            }
          }
        }
      } catch (txError) {
        // Ignore transaction details fetch errors
      }

      return {
        txid: txHash,
        blockHeight: Number(receipt.block_number ?? 0),
        blockTime,
        blockHash: receipt.block_hash ?? '',
        chainId: this.chainId,
        confirmations: status === TxStatus.Confirmed ? 1 : 0,
        status,
        fee,
        transfers,
        pubkey,
      }
    } catch (err) {
      return ErrorHandler(err, {
        translation: 'chainAdapters.errors.parseTx',
      })
    }
  }
}
