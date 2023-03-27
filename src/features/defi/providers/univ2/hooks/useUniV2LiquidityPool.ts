import { MaxUint256 } from '@ethersproject/constants'
import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import { ethChainId, fromAccountId, fromAssetId } from '@shapeshiftoss/caip'
import type { ethereum, EvmChainId, FeeData } from '@shapeshiftoss/chain-adapters'
import { supportsETH } from '@shapeshiftoss/hdwallet-core'
import type { ETH_FOX_POOL_CONTRACT_ADDRESS, FOX_TOKEN_CONTRACT_ADDRESS } from 'contracts/constants'
import { UNISWAP_V2_ROUTER_02_CONTRACT_ADDRESS } from 'contracts/constants'
import { getOrCreateContract } from 'contracts/contractManager'
import { ethers } from 'ethers'
import isNumber from 'lodash/isNumber'
import { useCallback, useMemo } from 'react'
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
  const asset0 = useAppSelector(state => selectAssetById(state, assetId0))
  const asset1 = useAppSelector(state => selectAssetById(state, assetId1))
  const lpAsset = useAppSelector(state => selectAssetById(state, lpAssetId))

  if (!lpAsset) throw new Error(`Fee asset not found for AssetId ${lpAssetId}`)
  if (!asset0) throw new Error(`Asset not found for AssetId ${assetId0}`)
  if (!asset1) throw new Error(`Asset not found for AssetId ${assetId1}`)

  const filter = useMemo(() => ({ accountId }), [accountId])

  const accountNumber = useAppSelector(state => selectAccountNumberByAccountId(state, filter))

  const {
    state: { wallet },
  } = useWallet()
  const asset0Price = useAppSelector(state => selectMarketDataById(state, assetId0)).price

  const chainAdapterManager = getChainAdapterManager()
  const adapter = chainAdapterManager.get(ethChainId) as unknown as ethereum.ChainAdapter
  const uniswapRouterContract = useMemo(
    () => (skip ? null : getOrCreateContract(UNISWAP_V2_ROUTER_02_CONTRACT_ADDRESS)),
    [skip],
  )

  // Checksummed addresses
  const asset1ContractAddress = useMemo(
    () => ethers.utils.getAddress(fromAssetId(assetId1).assetReference),
    [assetId1],
  )

  const lpContractAddress = useMemo(
    () => ethers.utils.getAddress(fromAssetId(lpAssetId).assetReference),
    [lpAssetId],
  )

  const asset1Contract = useMemo(
    // TODO(gomes): remove casting and make getOrCreateContract handle generic ERC-20s as input
    () =>
      skip ? null : getOrCreateContract(asset1ContractAddress as typeof FOX_TOKEN_CONTRACT_ADDRESS),
    [asset1ContractAddress, skip],
  )

  const uniV2LPContract = useMemo(
    // TODO(gomes): remove casting and make getOrCreateContract handle generic ERC-20s as input
    () =>
      skip ? null : getOrCreateContract(lpContractAddress as typeof ETH_FOX_POOL_CONTRACT_ADDRESS),
    [lpContractAddress, skip],
  )

  const addLiquidity = useCallback(
    async (token0Amount: string, token1Amount: string) => {
      try {
        if (skip || !accountId || !isNumber(accountNumber) || !uniswapRouterContract || !wallet)
          return
        if (!adapter) throw new Error(`addLiquidityEth: no adapter available for ${asset0.chainId}`)
        const value = bnOrZero(token0Amount)
          .times(bn(10).exponentiatedBy(asset0.precision))
          .toFixed(0)
        const data = uniswapRouterContract?.interface.encodeFunctionData('addLiquidityETH', [
          asset1ContractAddress,
          bnOrZero(token1Amount).times(bn(10).exponentiatedBy(asset1.precision)).toFixed(0),
          calculateSlippageMargin(token1Amount, asset1.precision),
          calculateSlippageMargin(token0Amount, asset0.precision),
          fromAccountId(accountId).account,
          Date.now() + 1200000,
        ])
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
              // the eth value need to be starting with 0x and be base 16
              value: '0x' + bnOrZero(value).toString(16),
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
        moduleLogger.warn(error, 'useFoxEthLiquidityPool:addLiquidity error')
      }
    },
    [
      accountId,
      accountNumber,
      adapter,
      asset0.chainId,
      asset0.precision,
      asset1.precision,
      asset1ContractAddress,
      skip,
      supportedEvmChainIds,
      uniswapRouterContract,
      wallet,
    ],
  )

  const removeLiquidity = useCallback(
    async (lpAmount: string, asset1Amount: string, asset0Amount: string) => {
      try {
        if (skip || !accountId || !isNumber(accountNumber) || !uniswapRouterContract || !wallet)
          return
        const chainAdapterManager = getChainAdapterManager()
        const adapter = chainAdapterManager.get(asset0.chainId) as unknown as ethereum.ChainAdapter
        if (!adapter) throw new Error(`addLiquidityEth: no adapter available for ${asset0.chainId}`)
        const data = uniswapRouterContract?.interface.encodeFunctionData('removeLiquidityETH', [
          asset1ContractAddress,
          bnOrZero(lpAmount).times(bn(10).exponentiatedBy(lpAsset.precision)).toFixed(0),
          calculateSlippageMargin(asset1Amount, asset1.precision),
          calculateSlippageMargin(asset0Amount, asset0.precision),
          fromAccountId(accountId).account,
          Date.now() + 1200000,
        ])
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
        moduleLogger.warn(error, 'useFoxEthLiquidityPool:remoLiquidity error')
      }
    },
    [
      skip,
      accountId,
      accountNumber,
      uniswapRouterContract,
      wallet,
      asset0.chainId,
      asset0.precision,
      asset1ContractAddress,
      lpAsset.precision,
      asset1.precision,
      supportedEvmChainIds,
    ],
  )

  const calculateHoldings = useCallback(async () => {
    if (skip || !uniV2LPContract || !accountId) return
    const balance = await uniV2LPContract.balanceOf(fromAccountId(accountId).account)
    const totalSupply = await uniV2LPContract.totalSupply()
    const reserves = await uniV2LPContract.getReserves()

    const userOwnershipOfPool = bnOrZero(balance.toString()).div(bnOrZero(totalSupply.toString()))
    const ethBalance = userOwnershipOfPool
      .times(bnOrZero(reserves[0].toString()))
      .div(`1e${asset0.precision}`)
    const foxBalance = userOwnershipOfPool
      .times(bnOrZero(reserves[1].toString()))
      .div(`1e${asset1.precision}`)

    return {
      ethBalance,
      foxBalance,
      lpBalance: bnOrZero(balance.toString()).toString(),
    }
  }, [skip, uniV2LPContract, accountId, asset0.precision, asset1.precision])

  const getLpTVL = useCallback(async () => {
    if (uniV2LPContract) {
      const reserves = await uniV2LPContract.getReserves()
      // Amount of Eth in liquidity pool
      const ethInReserve = bnOrZero(reserves?.[0]?.toString()).div(`1e${asset0.precision}`)

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
      return bnOrZero(tvl).div(bnOrZero(totalSupply.toString()).div(`1e${lpAsset.precision}`))
    }
  }, [skip, getLpTVL, lpAsset.precision, uniV2LPContract])

  const allowance = useCallback(
    async (forWithdrawal?: boolean) => {
      if (skip) return
      const contract = forWithdrawal ? uniV2LPContract : asset1Contract
      if (!accountId || !contract) return
      const accountAddress = fromAccountId(accountId).account
      const contractAddress = fromAssetId(uniswapV2Router02AssetId).assetReference
      const _allowance = await contract.allowance(accountAddress, contractAddress)
      return _allowance.toString()
    },
    [skip, uniV2LPContract, asset1Contract, accountId],
  )

  const getApproveGasData = useCallback(
    async (forWithdrawal?: boolean) => {
      if (skip) return
      const contract = forWithdrawal ? uniV2LPContract : asset1Contract
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
    [skip, uniV2LPContract, asset1Contract, adapter, accountId],
  )

  const getDepositGasDataCryptoBaseUnit = useCallback(
    async ({ token0Amount, token1Amount }: { token0Amount: string; token1Amount: string }) => {
      if (skip || !accountId || !uniswapRouterContract) return
      const value = bnOrZero(token0Amount)
        .times(bn(10).exponentiatedBy(asset0.precision))
        .toFixed(0)
      const accountAddress = fromAccountId(accountId).account
      const contractAddress = fromAssetId(uniswapV2Router02AssetId).assetReference
      const data = uniswapRouterContract.interface.encodeFunctionData('addLiquidityETH', [
        asset1ContractAddress,
        bnOrZero(token1Amount).times(bn(10).exponentiatedBy(asset1.precision)).toFixed(0),
        calculateSlippageMargin(token1Amount, asset1.precision),
        calculateSlippageMargin(token0Amount, asset0.precision),
        accountAddress,
        Date.now() + 1200000,
      ])
      const estimatedFees = await adapter.getFeeData({
        to: contractAddress,
        value,
        chainSpecific: {
          contractData: data,
          from: accountAddress,
        },
      })
      return estimatedFees
    },
    [
      skip,
      accountId,
      uniswapRouterContract,
      asset0.precision,
      asset1ContractAddress,
      asset1.precision,
      adapter,
    ],
  )

  const getWithdrawGasData = useCallback(
    async (lpAmount: string, asset0Amount: string, asset1Amount: string) => {
      if (skip || !accountId || !uniswapRouterContract) return
      const data = uniswapRouterContract.interface.encodeFunctionData('removeLiquidityETH', [
        asset1ContractAddress,
        bnOrZero(lpAmount).times(bn(10).exponentiatedBy(lpAsset.precision)).toFixed(0),
        calculateSlippageMargin(asset0Amount, asset1.precision),
        calculateSlippageMargin(asset1Amount, asset0.precision),
        fromAccountId(accountId).account,
        Date.now() + 1200000,
      ])
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
      asset1ContractAddress,
      lpAsset.precision,
      asset1.precision,
      asset0.precision,
      adapter,
    ],
  )

  const approve = useCallback(
    async (forWithdrawal?: boolean) => {
      if (skip || !wallet || !isNumber(accountNumber)) return
      const contract = forWithdrawal ? uniV2LPContract : asset1Contract

      if (!contract) return

      const contractAddress = fromAssetId(uniswapV2Router02AssetId).assetReference
      const data = contract.interface.encodeFunctionData('approve', [contractAddress, MaxUint256])
      const gasData = await getApproveGasData(forWithdrawal)
      if (!gasData) return
      const fees = gasData.average as FeeData<EvmChainId>
      const {
        chainSpecific: { gasPrice, gasLimit },
      } = fees
      if (gasPrice === undefined) {
        throw new Error(`approve: missing gasPrice for non-EIP-1559 tx`)
      }
      const result = await adapter.buildCustomTx({
        to: contract!.address,
        value: '0x00',
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
    [accountNumber, adapter, asset1Contract, getApproveGasData, skip, uniV2LPContract, wallet],
  )

  return {
    addLiquidity,
    allowance,
    approve,
    calculateHoldings,
    getApproveGasData,
    getDepositGasDataCryptoBaseUnit,
    getLpTVL,
    getWithdrawGasData,
    removeLiquidity,
    getLpTokenPrice,
  }
}
