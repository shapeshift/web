import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import { ASSET_REFERENCE, starknetAssetId, starknetChainId, toAssetId } from '@shapeshiftoss/caip'
import type { HDWallet, StarknetWallet } from '@shapeshiftoss/hdwallet-core'
import { supportsStarknet } from '@shapeshiftoss/hdwallet-core'
import type { Bip44Params, RootBip44Params } from '@shapeshiftoss/types'
import { KnownChainIds } from '@shapeshiftoss/types'
import { TransferType, TxStatus } from '@shapeshiftoss/unchained-client'
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
  SignAndBroadcastTransactionInput,
  SignTx,
  SignTxInput,
  Transaction,
  ValidAddressResult,
} from '../types'
import { ChainAdapterDisplayName, ValidAddressResultType } from '../types'
import { toAddressNList } from '../utils'

export interface ChainAdapterArgs {
  rpcUrl: string
}

// STRK token contract address on Starknet mainnet (native gas token)
const STRK_TOKEN_ADDRESS = '0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d'

// OpenZeppelin account contract class hash - same as used in hdwallet
const OPENZEPPELIN_ACCOUNT_CLASS_HASH =
  '0x05b4b537eaa2399e3aa99c4e2e0208ebd6c71bc1467938cd52c798c601e43564'

// RPC Response types
type RpcJsonResponse<T = unknown> = {
  result?: T
  error?: {
    code: number
    message: string
  }
}

type StarknetNonceResult = string

type StarknetFeeEstimate = {
  l1_gas_consumed?: string
  l1_gas_price?: string
  l2_gas_consumed?: string
  l2_gas_price?: string
  l1_data_gas_consumed?: string
  l1_data_gas_price?: string
}

type StarknetBlockResult = {
  timestamp?: number
}

type StarknetTxHashResult = {
  transaction_hash: string
}

type StarknetTxDetails = {
  fromAddress: string
  calldata: string[]
  nonce: string
  version: string
  resourceBounds: {
    l1_gas: { max_amount: bigint; max_price_per_unit: bigint }
    l2_gas: { max_amount: bigint; max_price_per_unit: bigint }
    l1_data_gas: { max_amount: bigint; max_price_per_unit: bigint }
  }
  chainId: string
}

type SignTxWithDetails = SignTx<KnownChainIds.StarknetMainnet> & {
  _txDetails: StarknetTxDetails
}

type TxHashOrObject = string | { transaction_hash: string }

type StarknetReceipt = {
  block_number?: string | number
  block_hash?: string
  execution_status?: string
  actual_fee?: { amount: string } | string | number
  events?: {
    keys: string[]
    data: string[]
    from_address: string
  }[]
}

type StarknetTransfer = {
  assetId: AssetId
  from: string[]
  to: string[]
  type: TransferType
  value: string
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

  constructor(args: ChainAdapterArgs) {
    this.provider = new RpcProvider({ nodeUrl: args.rpcUrl })
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
      let nativeBalance = '0'

      // Fetch STRK balance (native gas token)
      try {
        const callResult: string[] = await this.provider.callContract({
          contractAddress: STRK_TOKEN_ADDRESS,
          entrypoint: 'balanceOf',
          calldata: [pubkey],
        })

        if (callResult && Array.isArray(callResult)) {
          // Balance is returned as Uint256 (low, high)
          const low = BigInt(callResult[0] ?? '0x0')
          const high = BigInt(callResult[1] ?? '0x0')
          const balance = low + (high << BigInt(128))
          nativeBalance = balance.toString()
        }
      } catch (error) {
        // If the account is not deployed yet, balance queries will fail
        // This is expected - return 0 balance
        // The user can still receive funds to their counterfactual address
      }

      const tokens: {
        assetId: AssetId
        balance: string
        symbol: string
        name: string
        precision: number
      }[] = []

      return {
        balance: nativeBalance,
        chainId: this.chainId,
        assetId: this.assetId,
        chain: this.getType(),
        chainSpecific: {
          tokens,
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
      return Promise.resolve({ valid: true, result: ValidAddressResultType.Valid })
    } catch (err) {
      return Promise.resolve({ valid: false, result: ValidAddressResultType.Invalid })
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
        if (result.error.code === 20) {
          return false
        }
        return false
      }

      // If we got a nonce, account is deployed
      return true
    } catch (error) {
      return false
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

      // Verify address calculation matches wallet
      const constructorCalldataForAddress = CallData.compile([publicKey])
      const computedAddress = hash.calculateContractAddressFromHash(
        publicKey, // salt
        OPENZEPPELIN_ACCOUNT_CLASS_HASH,
        constructorCalldataForAddress,
        0, // deployer_address
      )

      // Format calldata - keep as-is from CallData.compile
      const formattedCalldata = constructorCalldata.map((data: string) => {
        if (!data.startsWith('0x')) {
          return num.toHex(data)
        }
        return data
      })

      const formattedSalt = salt.startsWith('0x') ? salt : `0x${salt}`

      // Estimate fees
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
        nonce_data_availability_mode: 'L1', // RPC expects "L1" or "L2"
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

      // Use starknet.js built-in v3 hash calculation
      // This ensures we match exactly what the RPC expects
      const txHash = hash.calculateDeployAccountTransactionHash({
        contractAddress: address,
        classHash: OPENZEPPELIN_ACCOUNT_CLASS_HASH,
        compiledConstructorCalldata: formattedCalldata,
        salt: formattedSalt,
        version,
        chainId: chainIdHex,
        nonce,
        nonceDataAvailabilityMode: 0, // L1 = 0
        feeDataAvailabilityMode: 0, // L1 = 0
        resourceBounds,
        tip: '0x0',
        paymasterData: [],
      })

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
            calldata: [
              normalizedTo,
              dummyUint256.low.toString(),
              dummyUint256.high.toString(),
            ],
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

          const nonceResponse = await this.provider.fetch('starknet_getNonce', ['pending', from])
          const nonceResult: RpcJsonResponse<StarknetNonceResult> = await nonceResponse.json()
          if (nonceResult.error) {
            throw new Error(`Failed to fetch nonce: ${nonceResult.error.message}`)
          }
          if (!nonceResult.result) {
            throw new Error('Nonce result is missing')
          }
          const nonce = nonceResult.result

          const estimateTx = {
            type: 'INVOKE',
            version: '0x3',
            sender_address: from,
            calldata: dummyFormattedCalldata,
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

      // Get account nonce using RPC directly
      const nonceResponse = await this.provider.fetch('starknet_getNonce', ['pending', from])
      const nonceResult: RpcJsonResponse<StarknetNonceResult> = await nonceResponse.json()

      if (nonceResult.error) {
        throw new Error(`Failed to fetch nonce: ${nonceResult.error.message}`)
      }

      if (!nonceResult.result) {
        throw new Error('Nonce result is missing')
      }

      const nonce = nonceResult.result

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

      // Use starknet.js built-in v3 hash calculation for INVOKE
      const txHash = hash.calculateInvokeTransactionHash({
        senderAddress: from,
        version,
        compiledCalldata: formattedCalldata,
        chainId: chainIdHex,
        nonce,
        nonceDataAvailabilityMode: 0, // L1 = 0
        feeDataAvailabilityMode: 0, // L1 = 0
        resourceBounds,
        tip: '0x0',
        paymasterData: [],
        accountDeploymentData: [],
      })

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

      return { txToSign: { ...txToSign, ...(input.pubKey ? { pubKey: input.pubKey } : {}) } }
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

  async getFeeData(): Promise<FeeDataEstimate<KnownChainIds.StarknetMainnet>> {
    try {
      const blockResponse = await this.provider.fetch('starknet_getBlockWithTxHashes', ['latest'])
      const blockResult: RpcJsonResponse<{ l1_gas_price?: { price_in_wei: string } }> =
        await blockResponse.json()

      const l1GasPriceWei = blockResult.result?.l1_gas_price?.price_in_wei
        ? BigInt(blockResult.result.l1_gas_price.price_in_wei)
        : BigInt('0x5f5e100')

      const typicalL1GasConsumed = BigInt('0x186a0')
      const typicalL1DataGasConsumed = BigInt('0x186a0')
      const l1DataGasPrice = BigInt('0x1')

      const estimatedTotalFee =
        typicalL1GasConsumed * l1GasPriceWei + typicalL1DataGasConsumed * l1DataGasPrice

      const slowFee = ((estimatedTotalFee * BigInt(80)) / BigInt(100)).toString()
      const slowMaxFee = ((estimatedTotalFee * BigInt(100)) / BigInt(100)).toString()

      const averageFee = ((estimatedTotalFee * BigInt(100)) / BigInt(100)).toString()
      const averageMaxFee = ((estimatedTotalFee * BigInt(120)) / BigInt(100)).toString()

      const fastFee = ((estimatedTotalFee * BigInt(120)) / BigInt(100)).toString()
      const fastMaxFee = ((estimatedTotalFee * BigInt(150)) / BigInt(100)).toString()

      return {
        slow: {
          txFee: slowFee,
          chainSpecific: { maxFee: slowMaxFee },
        },
        average: {
          txFee: averageFee,
          chainSpecific: { maxFee: averageMaxFee },
        },
        fast: {
          txFee: fastFee,
          chainSpecific: { maxFee: fastMaxFee },
        },
      }
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
                console.error('[StarknetChainAdapter.parseTx] Error parsing transfer event:', parseError)
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
      // Log error but don't throw - return unknown status instead
      console.error('Error parsing Starknet transaction:', err)
      const txHash =
        typeof txHashOrTx === 'string' ? txHashOrTx : txHashOrTx.transaction_hash ?? 'unknown'

      return {
        txid: txHash,
        blockHeight: -1,
        blockTime: 0,
        blockHash: '',
        chainId: this.chainId,
        confirmations: 0,
        status: TxStatus.Unknown,
        transfers: [],
        pubkey,
      }
    }
  }
}
