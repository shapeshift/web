import { MaxUint256 } from '@ethersproject/constants'
import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import { ethAssetId, ethChainId, fromAccountId, fromAssetId, toAssetId } from '@shapeshiftoss/caip'
import type { ethereum, EvmChainId, FeeData } from '@shapeshiftoss/chain-adapters'
import { supportsETH } from '@shapeshiftoss/hdwallet-core'
import {
  UNISWAP_V2_ROUTER_02_CONTRACT_ADDRESS,
  WETH_TOKEN_CONTRACT_ADDRESS,
} from 'contracts/constants'
import { getOrCreateContractByAddress, getOrCreateContractByType } from 'contracts/contractManager'
import { ContractType } from 'contracts/types'
import { ethers } from 'ethers'
import isNumber from 'lodash/isNumber'
import { useCallback, useMemo } from 'react'
import type { Address } from 'wagmi'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { useEvm } from 'hooks/useEvm/useEvm'
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

const moduleLogger = logger.child({ namespace: ['useUniV2LiquidityPool'] })

function calculateSlippageMargin(amount: string | null, precision: number) {
  if (!amount) throw new Error('Amount not given for slippage')
  const percentage = 3
  const remainingPercentage = (100 - percentage) / 100
  return bnOrZero(amount)
    .times(bn(10).exponentiatedBy(precision))
    .times(bnOrZero(remainingPercentage))
    .decimalPlaces(0)
    .toFixed()
}

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
  const { supportedEvmChainIds } = useEvm()
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

  const {
    state: { wallet },
  } = useWallet()
  const asset0Price = useAppSelector(state => selectMarketDataById(state, assetId0OrWeth)).price

  const chainAdapterManager = getChainAdapterManager()
  const adapter = chainAdapterManager.get(ethChainId) as unknown as ethereum.ChainAdapter
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

  const makeAddLiquidtyData = useCallback(
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
        if (!adapter) throw new Error(`addLiquidityEth: no adapter available for ${asset0.chainId}`)
        const maybeEthAmount = (() => {
          if (assetId0OrWeth === wethAssetId) return token0Amount
          if (assetId1OrWeth === wethAssetId) return token1Amount
          return '0'
        })()
        const ethValue = bnOrZero(maybeEthAmount)
          .times(bn(10).exponentiatedBy(weth.precision))
          .toFixed(0)
        const value = bnOrZero(ethValue).isZero() ? '0' : ethValue

        const data = makeAddLiquidtyData({
          token0Amount,
          token1Amount,
        })

        const adapterType = adapter.getChainId()
        const contractAddress = fromAssetId(uniswapV2Router02AssetId).assetReference
        const estimatedFees = await adapter.getFeeData({
          to: contractAddress,
          value,
          chainSpecific: {
            contractData: data,
            from: fromAccountId(accountId).account,
          },
        })
        const result = await (async () => {
          if (supportedEvmChainIds.includes(adapterType)) {
            if (!supportsETH(wallet))
              throw new Error(`addLiquidity: wallet does not support ethereum`)
            const fees = estimatedFees.average as FeeData<EvmChainId>
            const {
              chainSpecific: { gasPrice, gasLimit, maxFeePerGas, maxPriorityFeePerGas },
            } = fees
            const shouldUseEIP1559Fees =
              (await wallet.ethSupportsEIP1559()) &&
              maxFeePerGas !== undefined &&
              maxPriorityFeePerGas !== undefined
            if (!shouldUseEIP1559Fees && gasPrice === undefined) {
              throw new Error(`addLiquidity: missing gasPrice for non-EIP-1559 tx`)
            }
            const contractAddress = fromAssetId(uniswapV2Router02AssetId).assetReference
            return await adapter.buildCustomTx({
              to: contractAddress,
              // the ETH value need to be starting with 0x and be base 16
              value: value === '0' ? '0' : '0x' + bnOrZero(value).toString(16),
              wallet,
              data,
              gasLimit,
              accountNumber,
              ...(shouldUseEIP1559Fees ? { maxFeePerGas, maxPriorityFeePerGas } : { gasPrice }),
            })
          } else {
            throw new Error(`addLiquidity: wallet does not support ethereum`)
          }
        })()
        const txToSign = result.txToSign

        const broadcastTXID = await (async () => {
          if (wallet.supportsOfflineSigning()) {
            const signedTx = await adapter.signTransaction({
              txToSign,
              wallet,
            })
            return adapter.broadcastTransaction(signedTx)
          } else if (wallet.supportsBroadcast()) {
            /**
             * signAndBroadcastTransaction is an optional method on the HDWallet interface.
             * Check and see if it exists; if so, call and make sure a txhash is returned
             */
            if (!adapter.signAndBroadcastTransaction) {
              throw new Error('signAndBroadcastTransaction undefined for wallet')
            }
            return adapter.signAndBroadcastTransaction?.({ txToSign, wallet })
          } else {
            throw new Error('Bad hdwallet config')
          }
        })()

        if (!broadcastTXID) {
          throw new Error('Broadcast failed')
        }
        return broadcastTXID
      } catch (error) {
        moduleLogger.warn(error, 'useUniV2LiquidityPool:addLiquidity error')
      }
    },
    [
      accountId,
      accountNumber,
      adapter,
      asset0,
      assetId0OrWeth,
      assetId1OrWeth,
      makeAddLiquidtyData,
      skip,
      supportedEvmChainIds,
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
      const deadline = Date.now() + 1200000
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
        const chainAdapterManager = getChainAdapterManager()
        const adapter = chainAdapterManager.get(asset0.chainId) as unknown as ethereum.ChainAdapter
        if (!adapter) throw new Error(`addLiquidityEth: no adapter available for ${asset0.chainId}`)

        const data = makeRemoveLiquidityData({
          asset0ContractAddress,
          asset1ContractAddress,
          lpAmount,
          asset1Amount,
          asset0Amount,
        })

        const adapterType = adapter.getChainId()
        const contractAddress = fromAssetId(uniswapV2Router02AssetId).assetReference
        const estimatedFees = await adapter.getFeeData({
          to: contractAddress,
          value: '0',
          chainSpecific: {
            contractData: data,
            from: fromAccountId(accountId).account,
          },
        })
        const result = await (async () => {
          if (supportedEvmChainIds.includes(adapterType)) {
            if (!supportsETH(wallet))
              throw new Error(`addLiquidity: wallet does not support ethereum`)
            const fees = estimatedFees.average as FeeData<EvmChainId>
            const {
              chainSpecific: { gasPrice, gasLimit, maxFeePerGas, maxPriorityFeePerGas },
            } = fees
            const shouldUseEIP1559Fees =
              (await wallet.ethSupportsEIP1559()) &&
              maxFeePerGas !== undefined &&
              maxPriorityFeePerGas !== undefined
            if (!shouldUseEIP1559Fees && gasPrice === undefined) {
              throw new Error(`addLiquidity: missing gasPrice for non-EIP-1559 tx`)
            }
            const contractAddress = fromAssetId(uniswapV2Router02AssetId).assetReference
            return await adapter.buildCustomTx({
              to: contractAddress,
              value: '0x00',
              wallet,
              data,
              gasLimit,
              accountNumber,
              ...(shouldUseEIP1559Fees ? { maxFeePerGas, maxPriorityFeePerGas } : { gasPrice }),
            })
          } else {
            throw new Error(`addLiquidity: wallet does not support ethereum`)
          }
        })()
        const txToSign = result.txToSign

        const broadcastTXID = await (async () => {
          if (wallet.supportsOfflineSigning()) {
            const signedTx = await adapter.signTransaction({
              txToSign,
              wallet,
            })
            return adapter.broadcastTransaction(signedTx)
          } else if (wallet.supportsBroadcast()) {
            /**
             * signAndBroadcastTransaction is an optional method on the HDWallet interface.
             * Check and see if it exists; if so, call and make sure a txhash is returned
             */
            if (!adapter.signAndBroadcastTransaction) {
              throw new Error('signAndBroadcastTransaction undefined for wallet')
            }
            return adapter.signAndBroadcastTransaction?.({ txToSign, wallet })
          } else {
            throw new Error('Bad hdwallet config')
          }
        })()

        if (!broadcastTXID) {
          throw new Error('Broadcast failed')
        }
        return broadcastTXID
      } catch (error) {
        moduleLogger.warn(error, 'useUniV2LiquidityPool:remoLiquidity error')
      }
    },
    [
      skip,
      accountId,
      accountNumber,
      uniswapRouterContract,
      wallet,
      asset0.chainId,
      makeRemoveLiquidityData,
      asset0ContractAddress,
      asset1ContractAddress,
      supportedEvmChainIds,
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
    if (uniV2LPContract) {
      const reserves = await uniV2LPContract.getReserves()
      // Amount of Eth in liquidity pool
      const ethInReserve = bnOrZero(reserves?.[0]?.toString()).div(bn(10).pow(asset0.precision))

      // Total market cap of liquidity pool in usdc.
      // Multiplied by 2 to show equal amount of eth and fox.
      const totalLiquidity = ethInReserve.times(asset0Price).times(2)
      return totalLiquidity.toString()
    }
  }, [asset0.precision, asset0Price, uniV2LPContract])

  const getLpTokenPrice = useCallback(async () => {
    if (!skip && uniV2LPContract) {
      const tvl = await getLpTVL()
      const totalSupply = await uniV2LPContract.totalSupply()
      return bnOrZero(tvl).div(bnOrZero(totalSupply.toString()).div(bn(10).pow(lpAsset.precision)))
    }
  }, [skip, getLpTVL, lpAsset.precision, uniV2LPContract])

  // TODO(gomes): consolidate me
  const asset0Allowance = useCallback(async () => {
    if (skip) return
    const contract = asset0Contract
    if (!accountId || !contract) return
    const accountAddress = fromAccountId(accountId).account
    const contractAddress = fromAssetId(uniswapV2Router02AssetId).assetReference
    const _allowance = await contract.allowance(accountAddress, contractAddress)
    return _allowance.toString()
  }, [skip, asset0Contract, accountId])

  const asset1Allowance = useCallback(async () => {
    if (skip) return
    const contract = asset1Contract
    if (!accountId || !contract) return
    const accountAddress = fromAccountId(accountId).account
    const contractAddress = fromAssetId(uniswapV2Router02AssetId).assetReference
    const _allowance = await contract.allowance(accountAddress, contractAddress)
    return _allowance.toString()
  }, [skip, asset1Contract, accountId])

  const lpAllowance = useCallback(async () => {
    if (skip) return
    const contract = uniV2LPContract
    if (!accountId || !contract) return
    const accountAddress = fromAccountId(accountId).account
    const contractAddress = fromAssetId(uniswapV2Router02AssetId).assetReference
    const _allowance = await contract.allowance(accountAddress, contractAddress)
    return _allowance.toString()
  }, [skip, uniV2LPContract, accountId])

  const getApproveGasData = useCallback(
    async (contractAddress: Address) => {
      if (skip) return
      const contract = getOrCreateContractByType({
        address: contractAddress,
        type: ContractType.ERC20,
      })
      if (adapter && accountId && contract) {
        const data = contract.interface.encodeFunctionData('approve', [
          fromAssetId(uniswapV2Router02AssetId).assetReference,
          MaxUint256,
        ])
        const fees = await adapter.getFeeData({
          to: contract.address,
          value: '0',
          chainSpecific: {
            contractData: data,
            from: fromAccountId(accountId).account,
            contractAddress: contract.address,
          },
        })
        return fees
      }
    },
    [skip, adapter, accountId],
  )

  const getDepositGasDataCryptoBaseUnit = useCallback(
    async ({ token0Amount, token1Amount }: { token0Amount: string; token1Amount: string }) => {
      if (skip || !accountId || !uniswapRouterContract) return
      // https://docs.uniswap.org/contracts/v2/reference/smart-contracts/router-02#addliquidityeth
      const deadline = Date.now() + 1200000
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
        const estimatedFees = await adapter.getFeeData({
          to: contractAddress,
          value: ethValueBaseUnit,
          chainSpecific: {
            contractData: data,
            from: accountAddress,
          },
        })
        return estimatedFees
        // TODO(gomes): consolidate branching, surely we can do better
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
        const estimatedFees = await adapter.getFeeData({
          to: contractAddress,
          value: '0', // 0 ETH since these are ERC20 <-> ERC20 pools
          chainSpecific: {
            contractData: data,
            from: accountAddress,
          },
        })
        return estimatedFees
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

  const getWithdrawGasData = useCallback(
    async (lpAmount: string, asset0Amount: string, asset1Amount: string) => {
      if (skip || !accountId || !uniswapRouterContract) return
      const data = makeRemoveLiquidityData({
        lpAmount,
        asset0Amount,
        asset1Amount,
        asset0ContractAddress,
        asset1ContractAddress,
      })

      const contractAddress = fromAssetId(uniswapV2Router02AssetId).assetReference
      const estimatedFees = await adapter.getFeeData({
        to: contractAddress,
        value: '0',
        chainSpecific: {
          contractData: data,
          from: fromAccountId(accountId).account,
        },
      })
      return estimatedFees
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
      const gasData = await getApproveGasData(contractAddress)
      if (!gasData) return
      const fees = gasData.fast as FeeData<EvmChainId>
      const {
        chainSpecific: { gasPrice, gasLimit },
      } = fees
      if (gasPrice === undefined) {
        throw new Error(`approve: missing gasPrice for non-EIP-1559 tx`)
      }
      const result = await adapter.buildCustomTx({
        to: contract!.address,
        value: '0',
        wallet,
        data,
        gasLimit,
        accountNumber,
        gasPrice,
      })
      const txToSign = result.txToSign

      const broadcastTXID = await (async () => {
        if (wallet.supportsOfflineSigning()) {
          const signedTx = await adapter.signTransaction({
            txToSign,
            wallet,
          })
          return adapter.broadcastTransaction(signedTx)
        } else if (wallet.supportsBroadcast()) {
          /**
           * signAndBroadcastTransaction is an optional method on the HDWallet interface.
           * Check and see if it exists; if so, call and make sure a txhash is returned
           */
          if (!adapter.signAndBroadcastTransaction) {
            throw new Error('signAndBroadcastTransaction undefined for wallet')
          }
          return adapter.signAndBroadcastTransaction?.({ txToSign, wallet })
        } else {
          throw new Error('Bad hdwallet config')
        }
      })()
      return broadcastTXID
    },
    [accountNumber, adapter, getApproveGasData, skip, wallet],
  )

  return {
    addLiquidity,
    lpAllowance,
    asset0Allowance,
    asset1Allowance,
    approveAsset,
    calculateHoldings,
    getApproveGasData,
    getDepositGasDataCryptoBaseUnit,
    getLpTVL,
    getWithdrawGasData,
    removeLiquidity,
    getLpTokenPrice,
  }
}
