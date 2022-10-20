import { ChainId, fromChainId, toAssetId } from '@shapeshiftoss/caip'
import { ethers } from 'ethers'

import { Tx } from '../../../generated/ethereum'
import { BaseTxMetadata, TransferType } from '../../../types'
import { getSigHash, SubParser, txInteractsWithContract, TxSpecific } from '../../parser'
import ERC20_ABI from '../../parser/abi/erc20'
import UNIV2_ABI from './abi/uniV2'
import UNIV2_STAKING_REWARDS_ABI from './abi/uniV2StakingRewards'
import {
  UNI_V2_FOX_STAKING_REWARDS_V3,
  UNI_V2_ROUTER_CONTRACT,
  WETH_CONTRACT_MAINNET,
  WETH_CONTRACT_ROPSTEN,
} from './constants'

export interface TxMetadata extends BaseTxMetadata {
  parser: 'uniV2'
}

export interface ParserArgs {
  chainId: ChainId
  provider: ethers.providers.JsonRpcProvider
}

export class Parser implements SubParser<Tx> {
  provider: ethers.providers.JsonRpcProvider

  readonly chainId: ChainId
  readonly wethContract: string
  readonly abiInterface = new ethers.utils.Interface(UNIV2_ABI)
  readonly stakingRewardsInterface = new ethers.utils.Interface(UNIV2_STAKING_REWARDS_ABI)

  readonly supportedFunctions = {
    addLiquidityEthSigHash: this.abiInterface.getSighash('addLiquidityETH'),
    removeLiquidityEthSigHash: this.abiInterface.getSighash('removeLiquidityETH'),
  }

  readonly supportedStakingRewardsFunctions = {
    stakeSigHash: this.stakingRewardsInterface.getSighash('stake'),
    exitSigHash: this.stakingRewardsInterface.getSighash('exit'),
  }

  constructor(args: ParserArgs) {
    this.chainId = args.chainId
    this.provider = args.provider

    this.wethContract = (() => {
      switch (args.chainId) {
        case 'eip155:1':
          return WETH_CONTRACT_MAINNET
        case 'eip155:3':
          return WETH_CONTRACT_ROPSTEN
        default:
          throw new Error('chainId is not supported. (supported chainIds: eip155:1, eip155:3)')
      }
    })()
  }

  async parseUniV2(tx: Tx): Promise<TxSpecific | undefined> {
    if (!tx.inputData) return

    const txSigHash = getSigHash(tx.inputData)

    if (!Object.values(this.supportedFunctions).some((hash) => hash === txSigHash)) return

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

    const tokenAddress = ethers.utils.getAddress(decoded.args.token.toLowerCase())
    const lpTokenAddress = Parser.pairFor(tokenAddress, this.wethContract)

    const transfers = await (async () => {
      switch (getSigHash(tx.inputData)) {
        case this.supportedFunctions.addLiquidityEthSigHash: {
          const contract = new ethers.Contract(tokenAddress, ERC20_ABI, this.provider)
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
          const contract = new ethers.Contract(lpTokenAddress, ERC20_ABI, this.provider)
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

  async parseStakingRewards(tx: Tx): Promise<TxSpecific | undefined> {
    if (!tx.inputData) return

    const txSigHash = getSigHash(tx.inputData)

    if (!Object.values(this.supportedStakingRewardsFunctions).some((hash) => hash === txSigHash))
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
    if (txInteractsWithContract(tx, UNI_V2_ROUTER_CONTRACT)) return this.parseUniV2(tx)
    // TODO: parse any transaction that has input data that is able to be decoded using the `stakingRewardsInterface`
    if (txInteractsWithContract(tx, UNI_V2_FOX_STAKING_REWARDS_V3))
      return this.parseStakingRewards(tx)
    return
  }

  private static pairFor(tokenA: string, tokenB: string): string {
    const [token0, token1] = tokenA < tokenB ? [tokenA, tokenB] : [tokenB, tokenA]
    const factoryContract = '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f'
    const salt = ethers.utils.solidityKeccak256(['address', 'address'], [token0, token1])
    const initCodeHash = '0x96e8ac4277198ff8b6f785478aa9a39f403cb768dd02cbee326c3e7da348845f' // https://github.com/Uniswap/v2-periphery/blob/dda62473e2da448bc9cb8f4514dadda4aeede5f4/contracts/libraries/UniswapV2Library.sol#L24
    return ethers.utils.getCreate2Address(factoryContract, salt, initCodeHash)
  }
}
