import type { ChainId } from '@shapeshiftoss/caip'
import { fromChainId, toAssetId } from '@shapeshiftoss/caip'
import {
  UNI_V2_FOX_STAKING_REWARDS_CONTRACTS,
  UNISWAP_V2_FACTORY_CONTRACT_MAINNET,
  UNISWAP_V2_ROUTER_02_ABI,
  UNISWAP_V2_ROUTER_02_CONTRACT_MAINNET,
  UNIV2_STAKING_REWARDS_ABI,
  WETH_TOKEN_CONTRACT,
} from '@shapeshiftoss/contracts'
import assert from 'assert'
import type { JsonRpcProvider } from 'ethers'
import { Contract, getAddress, getCreate2Address, Interface, solidityPackedKeccak256 } from 'ethers'
import { erc20Abi } from 'viem'

import type { Tx } from '../../../generated/ethereum'
import type { BaseTxMetadata } from '../../../types'
import { TransferType } from '../../../types'
import type { SubParser, TxSpecific } from '../../parser'
import { getSigHash, txInteractsWithContract } from '../../parser'
export interface TxMetadata extends BaseTxMetadata {
  parser: 'uniV2'
}

export interface ParserArgs {
  chainId: ChainId
  provider: JsonRpcProvider
}

interface SupportedFunctions {
  addLiquidityEthSigHash: string
  removeLiquidityEthSigHash: string
}

interface SupportedStakingRewardsFunctions {
  stakeSigHash: string
  exitSigHash: string
}

export class Parser implements SubParser<Tx> {
  provider: JsonRpcProvider
  readonly chainId: ChainId
  readonly wethContract: string
  readonly abiInterface = new Interface(UNISWAP_V2_ROUTER_02_ABI)
  readonly stakingRewardsInterface = new Interface(UNIV2_STAKING_REWARDS_ABI)
  private readonly supportedFunctions: SupportedFunctions
  private readonly supportedStakingRewardsFunctions: SupportedStakingRewardsFunctions

  constructor(args: ParserArgs) {
    this.chainId = args.chainId
    this.provider = args.provider

    assert(args.chainId === 'eip155:1', `chainId '${args.chainId}' is not supported`)

    this.wethContract = WETH_TOKEN_CONTRACT

    const addLiquidityEthSigHash = this.abiInterface.getFunction('addLiquidityETH')?.selector
    const removeLiquidityEthSigHash = this.abiInterface.getFunction('removeLiquidityETH')?.selector

    const stakeSigHash = this.stakingRewardsInterface.getFunction('stake')?.selector
    const exitSigHash = this.stakingRewardsInterface.getFunction('exit')?.selector

    if (!(addLiquidityEthSigHash && removeLiquidityEthSigHash)) {
      throw new Error('Failed to get function selectors')
    }
    if (!(stakeSigHash && exitSigHash)) {
      throw new Error('Failed to get function selectors')
    }

    this.supportedFunctions = {
      addLiquidityEthSigHash,
      removeLiquidityEthSigHash,
    }

    this.supportedStakingRewardsFunctions = {
      stakeSigHash,
      exitSigHash,
    }
  }

  async parseUniV2(tx: Tx): Promise<TxSpecific | undefined> {
    if (!tx.inputData) return

    const txSigHash = getSigHash(tx.inputData)

    if (!Object.values(this.supportedFunctions).some(hash => hash === txSigHash)) return

    const decoded = this.abiInterface.parseTransaction({ data: tx.inputData })

    // failed to decode input data
    if (!decoded) return

    // Unconfirmed Txs are the edge case here, we augment them with transfers
    // For confirmed Tx, the metadata is all we actually need
    if (tx.confirmations)
      return {
        data: {
          parser: 'uniV2',
          method: decoded.name,
        },
      }

    const tokenAddress = getAddress(decoded.args.token.toLowerCase())
    const lpTokenAddress = Parser.pairFor(tokenAddress, this.wethContract)

    const transfers = await (async () => {
      switch (getSigHash(tx.inputData)) {
        case this.supportedFunctions.addLiquidityEthSigHash: {
          const contract = new Contract(tokenAddress, erc20Abi, this.provider)
          const decimals = await contract.decimals()
          const name = await contract.name()
          const symbol = await contract.symbol()
          const value = decoded.args.amountTokenDesired.toString()

          const assetId = toAssetId({
            ...fromChainId(this.chainId),
            assetNamespace: 'erc20',
            assetReference: tokenAddress,
          })

          return [
            {
              type: TransferType.Send,
              from: tx.from,
              to: lpTokenAddress,
              assetId,
              totalValue: value,
              components: [{ value }],
              token: { contract: tokenAddress, decimals, name, symbol },
            },
          ]
        }
        case this.supportedFunctions.removeLiquidityEthSigHash: {
          const contract = new Contract(lpTokenAddress, erc20Abi, this.provider)
          const decimals = await contract.decimals()
          const name = await contract.name()
          const symbol = await contract.symbol()
          const value = decoded.args.liquidity.toString()

          const assetId = toAssetId({
            ...fromChainId(this.chainId),
            assetNamespace: 'erc20',
            assetReference: lpTokenAddress,
          })

          return [
            {
              type: TransferType.Send,
              from: tx.from,
              to: lpTokenAddress,
              assetId,
              totalValue: value,
              components: [{ value }],
              token: { contract: lpTokenAddress, decimals, name, symbol },
            },
          ]
        }
        default:
          return
      }
    })()

    // no supported function detected
    if (!transfers) return

    return {
      transfers,
      data: {
        parser: 'uniV2',
        method: decoded.name,
      },
    }
  }

  parseStakingRewards(tx: Tx): TxSpecific | undefined {
    if (!tx.inputData) return

    const txSigHash = getSigHash(tx.inputData)

    if (!Object.values(this.supportedStakingRewardsFunctions).some(hash => hash === txSigHash))
      return

    const decoded = this.stakingRewardsInterface.parseTransaction({ data: tx.inputData })

    // failed to decode input data
    if (!decoded) return

    return {
      data: {
        parser: 'uniV2',
        method: decoded.name,
      },
    }
  }

  async parse(tx: Tx): Promise<TxSpecific | undefined> {
    if (txInteractsWithContract(tx, UNISWAP_V2_ROUTER_02_CONTRACT_MAINNET))
      return await this.parseUniV2(tx)

    // TODO: parse any transaction that has input data that is able to be decoded using the `stakingRewardsInterface`
    const isFoxStakingRewards = UNI_V2_FOX_STAKING_REWARDS_CONTRACTS.some(contract =>
      txInteractsWithContract(tx, contract),
    )

    if (isFoxStakingRewards) return await Promise.resolve(this.parseStakingRewards(tx))
  }

  private static pairFor(tokenA: string, tokenB: string): string {
    const [token0, token1] = tokenA < tokenB ? [tokenA, tokenB] : [tokenB, tokenA]
    const salt = solidityPackedKeccak256(['address', 'address'], [token0, token1])
    const initCodeHash = '0x96e8ac4277198ff8b6f785478aa9a39f403cb768dd02cbee326c3e7da348845f' // https://github.com/Uniswap/v2-periphery/blob/dda62473e2da448bc9cb8f4514dadda4aeede5f4/contracts/libraries/UniswapV2Library.sol#L24
    return getCreate2Address(UNISWAP_V2_FACTORY_CONTRACT_MAINNET, salt, initCodeHash)
  }
}
