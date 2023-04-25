import { MaxUint256 } from '@ethersproject/constants'
import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import { ethAssetId, ethChainId, fromAccountId, fromAssetId, toAssetId } from '@shapeshiftoss/caip'
import type { ethereum } from '@shapeshiftoss/chain-adapters'
import {
  UNISWAP_V2_ROUTER_02_CONTRACT_ADDRESS,
  WETH_TOKEN_CONTRACT_ADDRESS,
} from 'contracts/constants'
import { getOrCreateContractByAddress, getOrCreateContractByType } from 'contracts/contractManager'
import { ContractType } from 'contracts/types'
import { ethers } from 'ethers'
import { buildAndBroadcast, getFeeDataFromEstimate } from 'features/defi/helpers/utils'
import isNumber from 'lodash/isNumber'
import { useCallback, useMemo } from 'react'
import type { Address } from 'viem'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { useWallet } from 'hooks/useWallet/useWallet'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { logger } from 'lib/logger'
import { uniswapV2Router02AssetId } from 'state/slices/opportunitiesSlice/constants'
import {
  selectAccountNumberByAccountId,
  selectAssetById,
  selectMarketDataById,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { calculateSlippageMargin } from '../utils'

const moduleLogger = logger.child({ namespace: ['useUniV2LiquidityPool'] })

type UseUniV2LiquidityPoolOptions = {
  skip?: boolean
}

const wethAssetId = toAssetId({
  assetReference: WETH_TOKEN_CONTRACT_ADDRESS,
  chainId: ethChainId,
  assetNamespace: 'erc20',
})

export const useUniV2LiquidityPool = ({
  accountId,
  assetId0,
  assetId1,
  lpAssetId,
  skip,
}: {
  accountId: AccountId
  assetId0: AssetId
  assetId1: AssetId
  lpAssetId: AssetId
} & UseUniV2LiquidityPoolOptions) => {
  const assetId0OrWeth = assetId0 === ethAssetId ? wethAssetId : assetId0
  const assetId1OrWeth = assetId1 === ethAssetId ? wethAssetId : assetId1

  const asset0 = useAppSelector(state => selectAssetById(state, assetId0OrWeth))
  const asset1 = useAppSelector(state => selectAssetById(state, assetId1OrWeth))
  const weth = useAppSelector(state => selectAssetById(state, wethAssetId))
  const lpAsset = useAppSelector(state => selectAssetById(state, lpAssetId))

  if (!lpAsset) throw new Error(`LP asset not found for AssetId ${lpAssetId}`)
  if (!asset0) throw new Error(`Asset not found for AssetId ${assetId0OrWeth}`)
  if (!asset1) throw new Error(`Asset not found for AssetId ${assetId1OrWeth}`)
  if (!weth) throw new Error(`Asset not found for AssetId ${wethAssetId}`)

  const filter = useMemo(() => ({ accountId }), [accountId])
  const accountNumber = useAppSelector(state => selectAccountNumberByAccountId(state, filter))
  const wallet = useWallet().state.wallet
  const asset0Price = useAppSelector(state => selectMarketDataById(state, assetId0OrWeth)).price

  const chainAdapterManager = getChainAdapterManager()
  const adapter = chainAdapterManager.get(ethChainId) as unknown as
    | ethereum.ChainAdapter
    | undefined

  const uniswapRouterContract = useMemo(
    () => (skip ? null : getOrCreateContractByAddress(UNISWAP_V2_ROUTER_02_CONTRACT_ADDRESS)),
    [skip],
  )

  // Checksummed addresses
  const asset0ContractAddress = useMemo(
    () => ethers.utils.getAddress(fromAssetId(assetId0OrWeth).assetReference),
    [assetId0OrWeth],
  )
  const asset1ContractAddress = useMemo(
    () => ethers.utils.getAddress(fromAssetId(assetId1OrWeth).assetReference),
    [assetId1OrWeth],
  )

  const lpContractAddress = useMemo(
    () => ethers.utils.getAddress(fromAssetId(lpAssetId).assetReference),
    [lpAssetId],
  )

  const asset0Contract = useMemo(
    () =>
      skip
        ? null
        : getOrCreateContractByType({
            address: asset0ContractAddress,
            type: ContractType.ERC20,
          }),
    [asset0ContractAddress, skip],
  )

  const asset1Contract = useMemo(
    () =>
      skip
        ? null
        : getOrCreateContractByType({
            address: asset1ContractAddress,
            type: ContractType.ERC20,
          }),
    [asset1ContractAddress, skip],
  )

  const uniV2LPContract = useMemo(
    () =>
      skip
        ? null
        : getOrCreateContractByType({
            address: lpContractAddress,
            type: ContractType.UniV2Pair,
          }),
    [lpContractAddress, skip],
  )

  const makeAddLiquidityData = useCallback(
    ({ token0Amount, token1Amount }: { token0Amount: string; token1Amount: string }) => {
      if (!uniswapRouterContract) throw new Error('Uniswap router contract instance is undefined')
      const deadline = Date.now() + 1000 * 60 * 10 // 10 minutes from now
      if ([assetId0OrWeth, assetId1OrWeth].includes(wethAssetId)) {
        const ethAmount = (() => {
          if (assetId0OrWeth === wethAssetId) return token0Amount
          if (assetId1OrWeth === wethAssetId) return token1Amount
          return '0'
        })()

        const otherAssetContractAddress =
          assetId0OrWeth === wethAssetId ? asset1ContractAddress : asset0ContractAddress
        const otherAsset = assetId0OrWeth === wethAssetId ? asset1 : asset0
        const otherAssetAmount = assetId0OrWeth === wethAssetId ? token1Amount : token0Amount

        const accountAddress = fromAccountId(accountId).account

        const amountOtherAssetMin = calculateSlippageMargin(otherAssetAmount, otherAsset.precision)
        const amountEthMin = calculateSlippageMargin(ethAmount, weth.precision)

        return uniswapRouterContract.interface.encodeFunctionData('addLiquidityETH', [
          otherAssetContractAddress,
          bnOrZero(otherAssetAmount).times(bn(10).exponentiatedBy(otherAsset.precision)).toFixed(0),
          amountOtherAssetMin,
          amountEthMin,
          accountAddress,
          deadline,
        ])
      } else {
        const amountAsset0Min = calculateSlippageMargin(token0Amount, asset0.precision)
        const amountAsset1Min = calculateSlippageMargin(token1Amount, asset1.precision)

        return uniswapRouterContract.interface.encodeFunctionData('addLiquidity', [
          asset0ContractAddress,
          asset1ContractAddress,
          bnOrZero(token0Amount).times(bn(10).exponentiatedBy(asset0.precision)).toFixed(0),
          bnOrZero(token1Amount).times(bn(10).exponentiatedBy(asset1.precision)).toFixed(0),
          amountAsset0Min,
          amountAsset1Min,
          fromAccountId(accountId).account,
          deadline,
        ])
      }
    },
    [
      accountId,
      asset0,
      asset0ContractAddress,
      asset1,
      asset1ContractAddress,
      assetId0OrWeth,
      assetId1OrWeth,
      uniswapRouterContract,
      weth.precision,
    ],
  )

  const addLiquidity = useCallback(
    async ({ token0Amount, token1Amount }: { token0Amount: string; token1Amount: string }) => {
      try {
        if (skip || !accountId || !isNumber(accountNumber) || !uniswapRouterContract || !wallet)
          return

        if (!adapter) throw new Error(`no adapter available for ${asset0.chainId}`)

        const maybeEthAmount = (() => {
          if (assetId0OrWeth === wethAssetId) return token0Amount
          if (assetId1OrWeth === wethAssetId) return token1Amount
          return '0'
        })()

        const value = bnOrZero(maybeEthAmount)
          .times(bn(10).exponentiatedBy(weth.precision))
          .toFixed(0)

        const data = makeAddLiquidityData({ token0Amount, token1Amount })
        const contractAddress = fromAssetId(uniswapV2Router02AssetId).assetReference

        const feeData = await adapter.getFeeData({
          to: contractAddress,
          value,
          chainSpecific: {
            contractData: data,
            from: fromAccountId(accountId).account,
          },
        })

        const txid = await buildAndBroadcast({
          accountNumber,
          adapter,
          feeData: getFeeDataFromEstimate(feeData).chainSpecific,
          to: contractAddress,
          value,
          wallet,
          data,
        })

        return txid
      } catch (err) {
        moduleLogger.error(err, 'failed to addLiquidity')
      }
    },
    [
      accountId,
      accountNumber,
      adapter,
      asset0,
      assetId0OrWeth,
      assetId1OrWeth,
      makeAddLiquidityData,
      skip,
      uniswapRouterContract,
      wallet,
      weth,
    ],
  )

  const makeRemoveLiquidityData = useCallback(
    ({
      asset0ContractAddress,
      asset1ContractAddress,
      lpAmount,
      asset1Amount,
      asset0Amount,
    }: {
      asset0ContractAddress: string
      asset1ContractAddress: string
      lpAmount: string
      asset1Amount: string
      asset0Amount: string
    }) => {
      if (!uniswapRouterContract) throw new Error('uniswapRouterContract not defined')

      const lpAmountBaseUnit = bnOrZero(lpAmount)
        .times(bn(10).exponentiatedBy(lpAsset.precision))
        .toFixed(0)

      const deadline = Date.now() + 1200000 // 20 minutes from now
      const to = fromAccountId(accountId).account

      if ([assetId0OrWeth, assetId1OrWeth].includes(wethAssetId)) {
        const otherAssetContractAddress =
          assetId0OrWeth === wethAssetId ? asset1ContractAddress : asset0ContractAddress
        const otherAsset = assetId0OrWeth === wethAssetId ? asset1 : asset0
        const ethAmount = assetId0OrWeth === wethAssetId ? asset0Amount : asset1Amount
        const otherAssetAmount = assetId0OrWeth === wethAssetId ? asset1Amount : asset0Amount
        return uniswapRouterContract.interface.encodeFunctionData('removeLiquidityETH', [
          otherAssetContractAddress,
          lpAmountBaseUnit,
          calculateSlippageMargin(otherAssetAmount, otherAsset.precision),
          calculateSlippageMargin(ethAmount, weth.precision),
          to,
          deadline,
        ])
      }

      return uniswapRouterContract.interface.encodeFunctionData('removeLiquidity', [
        asset0ContractAddress,
        asset1ContractAddress,
        lpAmountBaseUnit,
        calculateSlippageMargin(asset0Amount, asset0.precision),
        calculateSlippageMargin(asset1Amount, asset1.precision),
        to,
        deadline,
      ])
    },
    [
      accountId,
      asset0,
      asset1,
      assetId0OrWeth,
      assetId1OrWeth,
      lpAsset.precision,
      uniswapRouterContract,
      weth.precision,
    ],
  )

  const removeLiquidity = useCallback(
    async ({
      lpAmount,
      asset1Amount,
      asset0Amount,
    }: {
      lpAmount: string
      asset1Amount: string
      asset0Amount: string
    }) => {
      try {
        if (skip || !accountId || !isNumber(accountNumber) || !uniswapRouterContract || !wallet)
          return

        if (!adapter) throw new Error(`no adapter available for ${asset0.chainId}`)

        const data = makeRemoveLiquidityData({
          asset0ContractAddress,
          asset1ContractAddress,
          lpAmount,
          asset1Amount,
          asset0Amount,
        })

        const contractAddress = fromAssetId(uniswapV2Router02AssetId).assetReference

        const feeData = await adapter.getFeeData({
          to: contractAddress,
          value: '0',
          chainSpecific: {
            contractData: data,
            from: fromAccountId(accountId).account,
          },
        })

        const txid = await buildAndBroadcast({
          accountNumber,
          adapter,
          feeData: getFeeDataFromEstimate(feeData).chainSpecific,
          to: contractAddress,
          value: '0',
          wallet,
          data,
        })

        return txid
      } catch (err) {
        moduleLogger.error(err, 'failed to removeLiquidity')
      }
    },
    [
      adapter,
      skip,
      accountId,
      accountNumber,
      uniswapRouterContract,
      wallet,
      asset0.chainId,
      makeRemoveLiquidityData,
      asset0ContractAddress,
      asset1ContractAddress,
    ],
  )

  const calculateHoldings = useCallback(async () => {
    if (skip || !uniV2LPContract || !accountId) return

    const balance = await uniV2LPContract.balanceOf(fromAccountId(accountId).account)
    const totalSupply = await uniV2LPContract.totalSupply()
    const reserves = await uniV2LPContract.getReserves()

    const userOwnershipOfPool = bnOrZero(balance.toString()).div(bnOrZero(totalSupply.toString()))
    const asset0Balance = userOwnershipOfPool
      .times(bnOrZero(reserves[0].toString()))
      .div(bn(10).pow(asset0.precision))
    const asset1Balance = userOwnershipOfPool
      .times(bnOrZero(reserves[1].toString()))
      .div(bn(10).pow(asset1.precision))

    return {
      asset0Balance,
      asset1Balance,
      lpBalance: bnOrZero(balance.toString()).toString(),
    }
  }, [skip, uniV2LPContract, accountId, asset0.precision, asset1.precision])

  const getLpTVL = useCallback(async () => {
    if (!uniV2LPContract) return

    const reserves = await uniV2LPContract.getReserves()
    // Amount of Eth in liquidity pool
    const ethInReserve = bnOrZero(reserves?.[0]?.toString()).div(bn(10).pow(asset0.precision))

    // Total market cap of liquidity pool in usdc.
    // Multiplied by 2 to show equal amount of eth and fox.
    const totalLiquidity = ethInReserve.times(asset0Price).times(2)
    return totalLiquidity.toString()
  }, [asset0.precision, asset0Price, uniV2LPContract])

  const getLpTokenPrice = useCallback(async () => {
    if (skip || !uniV2LPContract) return

    const tvl = await getLpTVL()
    const totalSupply = await uniV2LPContract.totalSupply()

    return bnOrZero(tvl).div(bnOrZero(totalSupply.toString()).div(bn(10).pow(lpAsset.precision)))
  }, [skip, getLpTVL, lpAsset.precision, uniV2LPContract])

  // TODO(gomes): consolidate me
  const asset0Allowance = useCallback(async () => {
    if (skip || !accountId || !asset0Contract) return

    const accountAddress = fromAccountId(accountId).account
    const contractAddress = fromAssetId(uniswapV2Router02AssetId).assetReference
    const _allowance = await asset0Contract.allowance(accountAddress, contractAddress)

    return _allowance.toString()
  }, [skip, asset0Contract, accountId])

  const asset1Allowance = useCallback(async () => {
    if (skip || !accountId || !asset1Contract) return

    const accountAddress = fromAccountId(accountId).account
    const contractAddress = fromAssetId(uniswapV2Router02AssetId).assetReference
    const _allowance = await asset1Contract.allowance(accountAddress, contractAddress)

    return _allowance.toString()
  }, [skip, asset1Contract, accountId])

  const lpAllowance = useCallback(async () => {
    if (skip || !accountId || !uniV2LPContract) return

    const accountAddress = fromAccountId(accountId).account
    const contractAddress = fromAssetId(uniswapV2Router02AssetId).assetReference
    const _allowance = await uniV2LPContract.allowance(accountAddress, contractAddress)

    return _allowance.toString()
  }, [skip, uniV2LPContract, accountId])

  const getApproveFeeData = useCallback(
    async (contractAddress: Address) => {
      if (skip || !adapter || !accountId) return

      const contract = getOrCreateContractByType({
        address: contractAddress,
        type: ContractType.ERC20,
      })

      if (!contract) return

      const data = contract.interface.encodeFunctionData('approve', [
        fromAssetId(uniswapV2Router02AssetId).assetReference,
        MaxUint256,
      ])

      const feeData = await adapter.getFeeData({
        to: contract.address,
        value: '0',
        chainSpecific: {
          contractData: data,
          from: fromAccountId(accountId).account,
          contractAddress: contract.address,
        },
      })

      return getFeeDataFromEstimate(feeData)
    },
    [skip, adapter, accountId],
  )

  const getDepositFeeData = useCallback(
    async ({ token0Amount, token1Amount }: { token0Amount: string; token1Amount: string }) => {
      if (skip || !adapter || !accountId || !uniswapRouterContract) return

      // https://docs.uniswap.org/contracts/v2/reference/smart-contracts/router-02#addliquidityeth
      const deadline = Date.now() + 1200000 // 20 minutes from now

      // TODO(gomes): consolidate branching, surely we can do better
      if ([assetId0OrWeth, assetId1OrWeth].includes(wethAssetId)) {
        const otherAssetContractAddress =
          assetId0OrWeth === wethAssetId ? asset1ContractAddress : asset0ContractAddress
        const otherAsset = assetId0OrWeth === wethAssetId ? asset1 : asset0
        const ethAmount = assetId0OrWeth === wethAssetId ? token0Amount : token1Amount
        const otherAssetAmount = assetId0OrWeth === wethAssetId ? token1Amount : token0Amount

        const ethValueBaseUnit = bnOrZero(ethAmount)
          .times(bn(10).exponentiatedBy(weth.precision))
          .toFixed(0)
        const accountAddress = fromAccountId(accountId).account
        const contractAddress = fromAssetId(uniswapV2Router02AssetId).assetReference

        const amountOtherAssetMin = calculateSlippageMargin(otherAssetAmount, otherAsset.precision)
        const amountEthMin = calculateSlippageMargin(ethAmount, weth.precision)

        const data = uniswapRouterContract.interface.encodeFunctionData('addLiquidityETH', [
          otherAssetContractAddress,
          bnOrZero(otherAssetAmount).times(bn(10).pow(otherAsset.precision)).toFixed(0),
          amountOtherAssetMin,
          amountEthMin,
          accountAddress,
          deadline,
        ])

        const feeData = await adapter.getFeeData({
          to: contractAddress,
          value: ethValueBaseUnit,
          chainSpecific: {
            contractData: data,
            from: accountAddress,
          },
        })

        return getFeeDataFromEstimate(feeData)
      } else {
        const accountAddress = fromAccountId(accountId).account
        const contractAddress = fromAssetId(uniswapV2Router02AssetId).assetReference

        const amountAsset0Min = calculateSlippageMargin(token0Amount, asset0.precision)
        const amountAsset1Min = calculateSlippageMargin(token1Amount, asset1.precision)

        const data = uniswapRouterContract.interface.encodeFunctionData('addLiquidity', [
          asset0ContractAddress,
          asset1ContractAddress,
          bnOrZero(token0Amount).times(bn(10).exponentiatedBy(asset0.precision)).toFixed(0),
          bnOrZero(token1Amount).times(bn(10).exponentiatedBy(asset1.precision)).toFixed(0),
          amountAsset0Min,
          amountAsset1Min,
          accountAddress,
          deadline,
        ])

        const feeData = await adapter.getFeeData({
          to: contractAddress,
          value: '0', // 0 ETH since these are ERC20 <-> ERC20 pools
          chainSpecific: {
            contractData: data,
            from: accountAddress,
          },
        })

        return getFeeDataFromEstimate(feeData)
      }
    },
    [
      skip,
      accountId,
      uniswapRouterContract,
      assetId0OrWeth,
      assetId1OrWeth,
      asset1ContractAddress,
      asset0ContractAddress,
      asset1,
      asset0,
      weth.precision,
      adapter,
    ],
  )

  const getWithdrawFeeData = useCallback(
    async (lpAmount: string, asset0Amount: string, asset1Amount: string) => {
      if (skip || !adapter || !accountId || !uniswapRouterContract) return

      const data = makeRemoveLiquidityData({
        lpAmount,
        asset0Amount,
        asset1Amount,
        asset0ContractAddress,
        asset1ContractAddress,
      })

      const contractAddress = fromAssetId(uniswapV2Router02AssetId).assetReference

      const feeData = await adapter.getFeeData({
        to: contractAddress,
        value: '0',
        chainSpecific: {
          contractData: data,
          from: fromAccountId(accountId).account,
        },
      })

      return getFeeDataFromEstimate(feeData)
    },
    [
      skip,
      accountId,
      uniswapRouterContract,
      makeRemoveLiquidityData,
      asset0ContractAddress,
      asset1ContractAddress,
      adapter,
    ],
  )

  const approveAsset = useCallback(
    async (contractAddress: Address) => {
      if (skip || !wallet || !isNumber(accountNumber)) return

      if (!adapter) throw new Error(`no adapter available for ${ethChainId}`)

      const contract = getOrCreateContractByType({
        address: contractAddress,
        type: ContractType.ERC20,
      })

      if (!contract) return

      const uniV2ContractAddress = fromAssetId(uniswapV2Router02AssetId).assetReference
      const data = contract.interface.encodeFunctionData('approve', [
        uniV2ContractAddress,
        MaxUint256,
      ])

      const feeData = await getApproveFeeData(contractAddress)
      if (!feeData) return

      const txid = await buildAndBroadcast({
        accountNumber,
        adapter,
        feeData: feeData.chainSpecific,
        to: contractAddress,
        value: '0',
        wallet,
        data,
      })

      return txid
    },
    [accountNumber, adapter, getApproveFeeData, skip, wallet],
  )

  return {
    addLiquidity,
    lpAllowance,
    asset0Allowance,
    asset1Allowance,
    approveAsset,
    calculateHoldings,
    getApproveFeeData,
    getDepositFeeData,
    getLpTVL,
    getWithdrawFeeData,
    removeLiquidity,
    getLpTokenPrice,
  }
}
