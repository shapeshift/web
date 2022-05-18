import { Tx as BlockbookTx } from '@shapeshiftoss/blockbook'
import { ChainId, fromChainId, toAssetId } from '@shapeshiftoss/caip'
import { ethers } from 'ethers'

import { TransferType, TxParser } from '../../types'
import { SubParser, TxSpecific } from '../types'
import ERC20_ABI from './abi/erc20'
import UNIV2_ABI from './abi/uniV2'
import { UNI_V2_ROUTER_CONTRACT, WETH_CONTRACT_MAINNET, WETH_CONTRACT_ROPSTEN } from './constants'
import { getSigHash, txInteractsWithContract } from './utils'

export interface ParserArgs {
  chainId: ChainId
  provider: ethers.providers.JsonRpcProvider
}

export class Parser implements SubParser {
  provider: ethers.providers.JsonRpcProvider

  readonly chainId: ChainId
  readonly wethContract: string
  readonly abiInterface = new ethers.utils.Interface(UNIV2_ABI)

  readonly supportedFunctions = {
    addLiquidityEthSigHash: this.abiInterface.getSighash('addLiquidityETH'),
    removeLiquidityEthSigHash: this.abiInterface.getSighash('removeLiquidityETH')
  }

  constructor(args: ParserArgs) {
    this.chainId = args.chainId
    this.provider = args.provider

    switch (args.chainId) {
      case 'eip155:1':
        this.wethContract = WETH_CONTRACT_MAINNET
        break
      case 'eip155:3':
        this.wethContract = WETH_CONTRACT_ROPSTEN
        break
      default:
        throw new Error('chainId is not supported. (supported chainIds: eip155:1, eip155:3)')
    }
  }

  async parse(tx: BlockbookTx): Promise<TxSpecific | undefined> {
    const txData = tx.ethereumSpecific?.data

    if (!txInteractsWithContract(tx, UNI_V2_ROUTER_CONTRACT)) return
    if (!txData) return
    if (tx.confirmations) return

    const txSigHash = getSigHash(txData)

    if (!Object.values(this.supportedFunctions).some((hash) => hash === txSigHash)) return

    const decoded = this.abiInterface.parseTransaction({ data: txData })

    // failed to decode input data
    if (!decoded) return

    const sendAddress = tx.vin[0].addresses?.[0] ?? ''
    const tokenAddress = ethers.utils.getAddress(decoded.args.token.toLowerCase())
    const lpTokenAddress = Parser.pairFor(tokenAddress, this.wethContract)

    const transfers = await (async () => {
      switch (getSigHash(txData)) {
        case this.supportedFunctions.addLiquidityEthSigHash: {
          const contract = new ethers.Contract(tokenAddress, ERC20_ABI, this.provider)
          const decimals = await contract.decimals()
          const name = await contract.name()
          const symbol = await contract.symbol()
          const value = decoded.args.amountTokenDesired.toString()

          const assetId = toAssetId({
            ...fromChainId(this.chainId),
            assetNamespace: 'erc20',
            assetReference: tokenAddress
          })

          return [
            {
              type: TransferType.Send,
              from: sendAddress,
              to: lpTokenAddress,
              assetId,
              totalValue: value,
              components: [{ value }],
              token: { contract: tokenAddress, decimals, name, symbol }
            }
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
            assetReference: lpTokenAddress
          })

          return [
            {
              type: TransferType.Send,
              from: sendAddress,
              to: lpTokenAddress,
              assetId,
              totalValue: value,
              components: [{ value }],
              token: { contract: lpTokenAddress, decimals, name, symbol }
            }
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
        parser: TxParser.UniV2,
        method: decoded.name
      }
    }
  }

  private static pairFor(tokenA: string, tokenB: string): string {
    const [token0, token1] = tokenA < tokenB ? [tokenA, tokenB] : [tokenB, tokenA]
    const factoryContract = '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f'
    const salt = ethers.utils.solidityKeccak256(['address', 'address'], [token0, token1])
    const initCodeHash = '0x96e8ac4277198ff8b6f785478aa9a39f403cb768dd02cbee326c3e7da348845f' // https://github.com/Uniswap/v2-periphery/blob/dda62473e2da448bc9cb8f4514dadda4aeede5f4/contracts/libraries/UniswapV2Library.sol#L24
    return ethers.utils.getCreate2Address(factoryContract, salt, initCodeHash)
  }
}
