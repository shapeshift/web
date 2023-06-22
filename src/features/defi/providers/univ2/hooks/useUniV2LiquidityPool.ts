import { MaxUint256 } from '@ethersproject/constants'
import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import { ethAssetId, ethChainId, fromAccountId, fromAssetId, toAssetId } from '@shapeshiftoss/caip'
import type { ethereum } from '@shapeshiftoss/chain-adapters'
import { supportsETH } from '@shapeshiftoss/hdwallet-core'
import {
  UNISWAP_V2_ROUTER_02_CONTRACT_ADDRESS,
  WETH_TOKEN_CONTRACT_ADDRESS,
} from 'contracts/constants'
import { getOrCreateContractByAddress, getOrCreateContractByType } from 'contracts/contractManager'
import { ContractType } from 'contracts/types'
import { ethers } from 'ethers'
import isNumber from 'lodash/isNumber'
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Address } from 'viem'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { useWallet } from 'hooks/useWallet/useWallet'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { fromBaseUnit, toBaseUnit } from 'lib/math'
import { buildAndBroadcast, createBuildCustomTxInput, getFees } from 'lib/utils/evm'
import { uniswapV2Router02AssetId } from 'state/slices/opportunitiesSlice/constants'
import {
  selectAccountNumberByAccountId,
  selectAssetById,
  selectMarketDataById,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { calculateSlippageMargin } from '../utils'

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

  const [supportsEIP1559, setSupportsEIP1559] = useState(false)

  useEffect(() => {
    if (!wallet) return
    ;(async () => {
      if (supportsETH(wallet)) {
        const result = await wallet.ethSupportsEIP1559()
        setSupportsEIP1559(result)
      }
    })()
  }, [wallet])

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

  const asset0Contract = useMemo(() => {
    return skip
      ? null
      : getOrCreateContractByType({
          address: asset0ContractAddress,
          type: ContractType.ERC20,
        })
  }, [asset0ContractAddress, skip])

  const asset1Contract = useMemo(() => {
    return skip
      ? null
      : getOrCreateContractByType({
          address: asset1ContractAddress,
          type: ContractType.ERC20,
        })
  }, [asset1ContractAddress, skip])

  const uniV2LPContract = useMemo(() => {
    return skip
      ? null
      : getOrCreateContractByType({
          address: lpContractAddress,
          type: ContractType.UniV2Pair,
        })
  }, [lpContractAddress, skip])

  const accountAddress = useMemo(() => fromAccountId(accountId).account, [accountId])

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

        const amountOtherAssetMin = calculateSlippageMargin(otherAssetAmount, otherAsset.precision)
        const amountEthMin = calculateSlippageMargin(ethAmount, weth.precision)

        return uniswapRouterContract.interface.encodeFunctionData('addLiquidityETH', [
          otherAssetContractAddress,
          toBaseUnit(otherAssetAmount, otherAsset.precision),
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
          toBaseUnit(token0Amount, asset0.precision),
          toBaseUnit(token1Amount, asset1.precision),
          amountAsset0Min,
          amountAsset1Min,
          fromAccountId(accountId).account,
          deadline,
        ])
      }
    },
    [
      accountAddress,
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
        if (skip || !isNumber(accountNumber) || !uniswapRouterContract || !wallet) return

        if (!adapter) throw new Error(`no adapter available for ${asset0.chainId}`)

        const maybeEthAmount = (() => {
          if (assetId0OrWeth === wethAssetId) return token0Amount
          if (assetId1OrWeth === wethAssetId) return token1Amount
          return '0'
        })()

        const fees = await getFees({
          adapter,
          data: makeAddLiquidityData({ token0Amount, token1Amount }),
          to: fromAssetId(uniswapV2Router02AssetId).assetReference,
          value: toBaseUnit(maybeEthAmount, weth.precision),
          from: accountAddress,
          supportsEIP1559,
        })

        const buildCustomTxInput = await createBuildCustomTxInput({
          accountNumber,
          adapter,
          data: makeAddLiquidityData({ token0Amount, token1Amount }),
          to: fromAssetId(uniswapV2Router02AssetId).assetReference,
          value: toBaseUnit(maybeEthAmount, weth.precision),
          wallet,
          chainSpecific: fees,
        })

        const txid = await buildAndBroadcast({ adapter, buildCustomTxInput, wallet })

        return txid
      } catch (err) {
        console.error(err)
      }
    },
    [
      accountAddress,
      accountNumber,
      adapter,
      asset0.chainId,
      assetId0OrWeth,
      assetId1OrWeth,
      makeAddLiquidityData,
      skip,
      supportsEIP1559,
      uniswapRouterContract,
      wallet,
      weth.precision,
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
          toBaseUnit(lpAmount, lpAsset.precision),
          calculateSlippageMargin(otherAssetAmount, otherAsset.precision),
          calculateSlippageMargin(ethAmount, weth.precision),
          to,
          deadline,
        ])
      }

      return uniswapRouterContract.interface.encodeFunctionData('removeLiquidity', [
        asset0ContractAddress,
        asset1ContractAddress,
        toBaseUnit(lpAmount, lpAsset.precision),
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
        if (skip || !isNumber(accountNumber) || !uniswapRouterContract || !wallet) return

        if (!adapter) throw new Error(`no adapter available for ${asset0.chainId}`)

        const data = makeRemoveLiquidityData({
          asset0ContractAddress,
          asset1ContractAddress,
          lpAmount,
          asset1Amount,
          asset0Amount,
        })

        const fees = await getFees({
          supportsEIP1559,
          from: accountAddress,
          adapter,
          data,
          to: fromAssetId(uniswapV2Router02AssetId).assetReference,
          value: '0',
        })

        const buildCustomTxInput = await createBuildCustomTxInput({
          accountNumber,
          wallet,
          adapter,
          data,
          to: fromAssetId(uniswapV2Router02AssetId).assetReference,
          value: '0',
          chainSpecific: fees,
        })

        const txid = await buildAndBroadcast({ adapter, buildCustomTxInput, wallet })

        return txid
      } catch (err) {
        console.error(err)
      }
    },
    [
      skip,
      accountNumber,
      uniswapRouterContract,
      wallet,
      adapter,
      asset0.chainId,
      makeRemoveLiquidityData,
      asset0ContractAddress,
      asset1ContractAddress,
      supportsEIP1559,
      accountAddress,
    ],
  )

  const calculateHoldings = useCallback(async () => {
    if (skip || !uniV2LPContract || !accountId) return

    const balance = await uniV2LPContract.balanceOf(fromAccountId(accountId).account)
    const totalSupply = await uniV2LPContract.totalSupply()
    const reserves = await uniV2LPContract.getReserves()

    const userOwnershipOfPool = bnOrZero(balance.toString()).div(bnOrZero(totalSupply.toString()))
    const asset0Balance = userOwnershipOfPool.times(
      fromBaseUnit(reserves[0].toString(), asset0.precision),
    )
    const asset1Balance = userOwnershipOfPool.times(
      fromBaseUnit(reserves[1].toString(), asset1.precision),
    )

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
    const ethInReserve = bn(fromBaseUnit(reserves?.[0]?.toString(), asset0.precision))

    // Total market cap of liquidity pool in usdc.
    // Multiplied by 2 to show equal amount of eth and fox.
    const totalLiquidity = ethInReserve.times(asset0Price).times(2)
    return totalLiquidity.toString()
  }, [asset0.precision, asset0Price, uniV2LPContract])

  const getLpTokenPrice = useCallback(async () => {
    if (skip || !uniV2LPContract) return

    const tvl = await getLpTVL()
    const totalSupply = await uniV2LPContract.totalSupply()

    return bnOrZero(tvl).div(fromBaseUnit(totalSupply.toString(), lpAsset.precision))
  }, [skip, getLpTVL, lpAsset.precision, uniV2LPContract])

  // TODO(gomes): consolidate me
  const asset0Allowance = useCallback(async () => {
    if (skip || !accountId || !asset0Contract) return

    const contractAddress = fromAssetId(uniswapV2Router02AssetId).assetReference
    const _allowance = await asset0Contract.allowance(accountAddress, contractAddress)

    return _allowance.toString()
  }, [skip, accountId, asset0Contract, accountAddress])

  const asset1Allowance = useCallback(async () => {
    if (skip || !accountId || !asset1Contract) return

    const contractAddress = fromAssetId(uniswapV2Router02AssetId).assetReference
    const _allowance = await asset1Contract.allowance(accountAddress, contractAddress)

    return _allowance.toString()
  }, [skip, accountId, asset1Contract, accountAddress])

  const lpAllowance = useCallback(async () => {
    if (skip || !accountId || !uniV2LPContract) return

    const contractAddress = fromAssetId(uniswapV2Router02AssetId).assetReference
    const _allowance = await uniV2LPContract.allowance(accountAddress, contractAddress)

    return _allowance.toString()
  }, [skip, accountId, uniV2LPContract, accountAddress])

  const getApproveFees = useCallback(
    (contractAddress: Address) => {
      if (skip || !adapter || !isNumber(accountNumber) || !wallet) return

      const contract = getOrCreateContractByType({
        address: contractAddress,
        type: ContractType.ERC20,
      })

      if (!contract) return

      const data = contract.interface.encodeFunctionData('approve', [
        fromAssetId(uniswapV2Router02AssetId).assetReference,
        MaxUint256,
      ])

      return getFees({
        supportsEIP1559,
        from: accountAddress,
        adapter,
        data,
        to: contract.address,
        value: '0',
      })
    },
    [skip, adapter, accountNumber, wallet, supportsEIP1559, accountAddress],
  )

  const getDepositFees = useCallback(
    ({ token0Amount, token1Amount }: { token0Amount: string; token1Amount: string }) => {
      if (
        skip ||
        !adapter ||
        !accountId ||
        !isNumber(accountNumber) ||
        !uniswapRouterContract ||
        !wallet
      )
        return

      // https://docs.uniswap.org/contracts/v2/reference/smart-contracts/router-02#addliquidityeth
      const deadline = Date.now() + 1200000 // 20 minutes from now

      // TODO(gomes): consolidate branching, surely we can do better
      if ([assetId0OrWeth, assetId1OrWeth].includes(wethAssetId)) {
        const otherAssetContractAddress =
          assetId0OrWeth === wethAssetId ? asset1ContractAddress : asset0ContractAddress
        const otherAsset = assetId0OrWeth === wethAssetId ? asset1 : asset0
        const ethAmount = assetId0OrWeth === wethAssetId ? token0Amount : token1Amount
        const otherAssetAmount = assetId0OrWeth === wethAssetId ? token1Amount : token0Amount

        const accountAddress = fromAccountId(accountId).account
        const amountOtherAssetMin = calculateSlippageMargin(otherAssetAmount, otherAsset.precision)
        const amountEthMin = calculateSlippageMargin(ethAmount, weth.precision)

        const data = uniswapRouterContract.interface.encodeFunctionData('addLiquidityETH', [
          otherAssetContractAddress,
          toBaseUnit(otherAssetAmount, otherAsset.precision),
          amountOtherAssetMin,
          amountEthMin,
          accountAddress,
          deadline,
        ])

        return getFees({
          supportsEIP1559,
          from: accountAddress,
          adapter,
          data,
          to: fromAssetId(uniswapV2Router02AssetId).assetReference,
          value: toBaseUnit(ethAmount, weth.precision),
        })
      } else {
        const accountAddress = fromAccountId(accountId).account
        const amountAsset0Min = calculateSlippageMargin(token0Amount, asset0.precision)
        const amountAsset1Min = calculateSlippageMargin(token1Amount, asset1.precision)

        const data = uniswapRouterContract.interface.encodeFunctionData('addLiquidity', [
          asset0ContractAddress,
          asset1ContractAddress,
          toBaseUnit(token0Amount, asset0.precision),
          toBaseUnit(token1Amount, asset1.precision),
          amountAsset0Min,
          amountAsset1Min,
          accountAddress,
          deadline,
        ])

        return getFees({
          supportsEIP1559,
          from: accountAddress,
          adapter,
          data,
          to: fromAssetId(uniswapV2Router02AssetId).assetReference,
          value: '0',
        })
      }
    },
    [
      skip,
      adapter,
      accountId,
      accountNumber,
      uniswapRouterContract,
      wallet,
      assetId0OrWeth,
      assetId1OrWeth,
      asset1ContractAddress,
      asset0ContractAddress,
      asset1,
      asset0,
      weth.precision,
      supportsEIP1559,
    ],
  )

  const getWithdrawFees = useCallback(
    (lpAmount: string, asset0Amount: string, asset1Amount: string) => {
      if (skip || !adapter || !isNumber(accountNumber) || !uniswapRouterContract || !wallet) return

      const data = makeRemoveLiquidityData({
        lpAmount,
        asset0Amount,
        asset1Amount,
        asset0ContractAddress,
        asset1ContractAddress,
      })

      return getFees({
        supportsEIP1559,
        from: accountAddress,
        adapter,
        data,
        to: fromAssetId(uniswapV2Router02AssetId).assetReference,
        value: '0',
      })
    },
    [
      skip,
      adapter,
      accountNumber,
      uniswapRouterContract,
      wallet,
      makeRemoveLiquidityData,
      asset0ContractAddress,
      asset1ContractAddress,
      supportsEIP1559,
      accountAddress,
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

      const fees = await getApproveFees(contractAddress)
      if (!fees) return

      const txid = await buildAndBroadcast({
        wallet,
        adapter,
        buildCustomTxInput: {
          from: accountAddress,
          accountNumber,
          to: contractAddress,
          value: '0',
          data,
          ...fees,
        },
      })

      return txid
    },
    [accountAddress, accountNumber, adapter, getApproveFees, skip, wallet],
  )

  return {
    addLiquidity,
    lpAllowance,
    asset0Allowance,
    asset1Allowance,
    approveAsset,
    calculateHoldings,
    getApproveFees,
    getDepositFees,
    getLpTVL,
    getWithdrawFees,
    removeLiquidity,
    getLpTokenPrice,
  }
}
