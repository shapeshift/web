import { Contract } from '@ethersproject/contracts'
import type { AccountId } from '@shapeshiftoss/caip'
import { fromAccountId } from '@shapeshiftoss/caip'
import { ethAssetId, foxAssetId, fromAssetId } from '@shapeshiftoss/caip'
import type {
  ChainAdapter,
  ethereum,
  EvmBaseAdapter,
  EvmChainId,
  FeeData,
} from '@shapeshiftoss/chain-adapters'
import { supportsETH } from '@shapeshiftoss/hdwallet-core'
import type { KnownChainIds } from '@shapeshiftoss/types'
import IUniswapV2Pair from '@uniswap/v2-core/build/IUniswapV2Pair.json'
import isNumber from 'lodash/isNumber'
import { FOX_TOKEN_CONTRACT_ADDRESS } from 'plugins/foxPage/const'
import { getEthersProvider } from 'plugins/foxPage/utils'
import { useCallback, useMemo } from 'react'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { useEvm } from 'hooks/useEvm/useEvm'
import { useWallet } from 'hooks/useWallet/useWallet'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { logger } from 'lib/logger'
import {
  selectAccountNumberByAccountId,
  selectAssetById,
  selectMarketDataById,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'
import type { Nullable } from 'types/common'

import erc20abi from '../abis/erc20abi.json'
import IUniswapV2Router02ABI from '../abis/IUniswapV2Router02.json'
import {
  foxEthLpAssetId,
  MAX_ALLOWANCE,
  UNISWAP_V2_ROUTER_ADDRESS,
  UNISWAP_V2_WETH_FOX_POOL_ADDRESS,
} from '../constants'

const moduleLogger = logger.child({ namespace: ['useFoxEthLiquidityPool'] })

// TODO: use wagmi provider
const maybeEthersProvider = (skip?: boolean) => (skip ? null : getEthersProvider())

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

type UseFoxEthLiquidityPoolOptions = {
  skip?: boolean
}

export const useFoxEthLiquidityPool = (
  accountId: Nullable<AccountId>,
  { skip }: UseFoxEthLiquidityPoolOptions = {},
) => {
  const { supportedEvmChainIds } = useEvm()
  const ethAsset = useAppSelector(state => selectAssetById(state, ethAssetId))
  const foxAsset = useAppSelector(state => selectAssetById(state, foxAssetId))
  const lpAsset = useAppSelector(state => selectAssetById(state, foxEthLpAssetId))

  const filter = useMemo(() => ({ accountId: accountId ?? '' }), [accountId])

  const accountNumber = useAppSelector(state => selectAccountNumberByAccountId(state, filter))

  const {
    state: { wallet },
  } = useWallet()
  const ethPrice = useAppSelector(state => selectMarketDataById(state, ethAssetId)).price

  const chainAdapterManager = getChainAdapterManager()
  const adapter = chainAdapterManager.get(ethAsset.chainId) as ChainAdapter<KnownChainIds>

  const uniswapRouterContract = useMemo(
    () =>
      skip
        ? null
        : new Contract(
            UNISWAP_V2_ROUTER_ADDRESS,
            IUniswapV2Router02ABI.abi,
            maybeEthersProvider(skip)!,
          ),
    [skip],
  )

  const foxContract = useMemo(
    () =>
      skip ? null : new Contract(FOX_TOKEN_CONTRACT_ADDRESS, erc20abi, maybeEthersProvider(skip)!),
    [skip],
  )

  const uniV2LPContract = useMemo(
    () =>
      skip
        ? null
        : new Contract(
            UNISWAP_V2_WETH_FOX_POOL_ADDRESS,
            IUniswapV2Pair.abi,
            maybeEthersProvider(skip)!,
          ),
    [skip],
  )

  const addLiquidity = useCallback(
    async (foxAmount: string, ethAmount: string) => {
      try {
        if (skip || !accountId || !isNumber(accountNumber) || !uniswapRouterContract || !wallet)
          return
        if (!adapter)
          throw new Error(`addLiquidityEth: no adapter available for ${ethAsset.chainId}`)
        const value = bnOrZero(ethAmount)
          .times(bn(10).exponentiatedBy(ethAsset.precision))
          .toFixed(0)
        const data = uniswapRouterContract?.interface.encodeFunctionData('addLiquidityETH', [
          FOX_TOKEN_CONTRACT_ADDRESS,
          bnOrZero(foxAmount).times(bn(10).exponentiatedBy(foxAsset.precision)).toFixed(0),
          calculateSlippageMargin(foxAmount, foxAsset.precision),
          calculateSlippageMargin(ethAmount, ethAsset.precision),
          fromAccountId(accountId).account,
          Date.now() + 1200000,
        ])
        const adapterType = adapter.getChainId()
        const estimatedFees = await (adapter as unknown as EvmBaseAdapter<EvmChainId>).getFeeData({
          to: UNISWAP_V2_ROUTER_ADDRESS,
          value,
          chainSpecific: {
            contractData: data,
            from: fromAccountId(accountId).account,
          },
        })
        const result = await (async () => {
          if (supportedEvmChainIds.includes(adapterType)) {
            if (!supportsETH(wallet))
              throw new Error(`addLiquidityEthFox: wallet does not support ethereum`)
            const fees = estimatedFees.average as FeeData<EvmChainId>
            const {
              chainSpecific: { gasPrice, gasLimit, maxFeePerGas, maxPriorityFeePerGas },
            } = fees
            const shouldUseEIP1559Fees =
              (await wallet.ethSupportsEIP1559()) &&
              maxFeePerGas !== undefined &&
              maxPriorityFeePerGas !== undefined
            if (!shouldUseEIP1559Fees && gasPrice === undefined) {
              throw new Error(`addLiquidityEthFox: missing gasPrice for non-EIP-1559 tx`)
            }
            return await (adapter as unknown as ethereum.ChainAdapter).buildCustomTx({
              to: UNISWAP_V2_ROUTER_ADDRESS,
              // the eth value need to be starting with 0x and be base 16
              value: '0x' + bnOrZero(value).toString(16),
              wallet,
              data,
              gasLimit,
              bip44Params: adapter.buildBIP44Params({
                accountNumber,
              }),
              ...(shouldUseEIP1559Fees ? { maxFeePerGas, maxPriorityFeePerGas } : { gasPrice }),
            })
          } else {
            throw new Error(`addLiquidityEthFox: wallet does not support ethereum`)
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
      ethAsset.chainId,
      ethAsset.precision,
      foxAsset.precision,
      skip,
      supportedEvmChainIds,
      uniswapRouterContract,
      wallet,
    ],
  )

  const removeLiquidity = useCallback(
    async (lpAmount: string, foxAmount: string, ethAmount: string) => {
      try {
        if (skip || !accountId || !isNumber(accountNumber) || !uniswapRouterContract || !wallet)
          return
        const chainAdapterManager = getChainAdapterManager()
        const adapter = chainAdapterManager.get(ethAsset.chainId) as ChainAdapter<KnownChainIds>
        if (!adapter)
          throw new Error(`addLiquidityEth: no adapter available for ${ethAsset.chainId}`)
        const data = uniswapRouterContract?.interface.encodeFunctionData('removeLiquidityETH', [
          FOX_TOKEN_CONTRACT_ADDRESS,
          bnOrZero(lpAmount).times(bn(10).exponentiatedBy(lpAsset.precision)).toFixed(0),
          calculateSlippageMargin(foxAmount, foxAsset.precision),
          calculateSlippageMargin(ethAmount, ethAsset.precision),
          fromAccountId(accountId).account,
          Date.now() + 1200000,
        ])
        const adapterType = adapter.getChainId()
        const estimatedFees = await (adapter as unknown as EvmBaseAdapter<EvmChainId>).getFeeData({
          to: UNISWAP_V2_ROUTER_ADDRESS,
          value: '0',
          chainSpecific: {
            contractData: data,
            from: fromAccountId(accountId).account,
          },
        })
        const result = await (async () => {
          if (supportedEvmChainIds.includes(adapterType)) {
            if (!supportsETH(wallet))
              throw new Error(`addLiquidityEthFox: wallet does not support ethereum`)
            const fees = estimatedFees.average as FeeData<EvmChainId>
            const {
              chainSpecific: { gasPrice, gasLimit, maxFeePerGas, maxPriorityFeePerGas },
            } = fees
            const shouldUseEIP1559Fees =
              (await wallet.ethSupportsEIP1559()) &&
              maxFeePerGas !== undefined &&
              maxPriorityFeePerGas !== undefined
            if (!shouldUseEIP1559Fees && gasPrice === undefined) {
              throw new Error(`addLiquidityEthFox: missing gasPrice for non-EIP-1559 tx`)
            }
            return await (adapter as unknown as ethereum.ChainAdapter).buildCustomTx({
              to: UNISWAP_V2_ROUTER_ADDRESS,
              value: '0x00',
              wallet,
              data,
              gasLimit,
              bip44Params: adapter.buildBIP44Params({
                accountNumber,
              }),
              ...(shouldUseEIP1559Fees ? { maxFeePerGas, maxPriorityFeePerGas } : { gasPrice }),
            })
          } else {
            throw new Error(`addLiquidityEthFox: wallet does not support ethereum`)
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
      ethAsset.chainId,
      ethAsset.precision,
      lpAsset.precision,
      foxAsset.precision,
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
      .div(`1e${ethAsset.precision}`)
    const foxBalance = userOwnershipOfPool
      .times(bnOrZero(reserves[1].toString()))
      .div(`1e${foxAsset.precision}`)

    return {
      ethBalance,
      foxBalance,
      lpBalance: bnOrZero(balance.toString()).toString(),
    }
  }, [skip, uniV2LPContract, accountId, ethAsset.precision, foxAsset.precision])

  const getLpTVL = useCallback(async () => {
    if (uniV2LPContract) {
      const reserves = await uniV2LPContract.getReserves()
      // Amount of Eth in liquidity pool
      const ethInReserve = bnOrZero(reserves?.[0]?.toString()).div(`1e${ethAsset.precision}`)

      // Total market cap of liquidity pool in usdc.
      // Multiplied by 2 to show equal amount of eth and fox.
      const totalLiquidity = ethInReserve.times(ethPrice).times(2)
      return totalLiquidity.toString()
    }
  }, [ethAsset.precision, ethPrice, uniV2LPContract])

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
      const contract = forWithdrawal ? uniV2LPContract : foxContract
      if (!accountId || !contract) return
      const _allowance = await contract.allowance(
        fromAccountId(accountId).account,
        UNISWAP_V2_ROUTER_ADDRESS,
      )
      return _allowance.toString()
    },
    [skip, uniV2LPContract, foxContract, accountId],
  )

  const getApproveGasData = useCallback(
    async (forWithdrawal?: boolean) => {
      if (skip) return
      const contract = forWithdrawal ? uniV2LPContract : foxContract
      if (adapter && accountId && contract) {
        const data = contract.interface.encodeFunctionData('approve', [
          UNISWAP_V2_ROUTER_ADDRESS,
          MAX_ALLOWANCE,
        ])
        const fees = await (adapter as unknown as EvmBaseAdapter<EvmChainId>).getFeeData({
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
    [skip, uniV2LPContract, foxContract, adapter, accountId],
  )

  const getDepositGasData = useCallback(
    async (foxAmount: string, ethAmount: string) => {
      if (skip || !accountId || !uniswapRouterContract) return
      const value = bnOrZero(ethAmount).times(bn(10).exponentiatedBy(ethAsset.precision)).toFixed(0)
      const data = uniswapRouterContract.interface.encodeFunctionData('addLiquidityETH', [
        fromAssetId(foxAssetId).assetReference,
        bnOrZero(foxAmount).times(bn(10).exponentiatedBy(foxAsset.precision)).toFixed(0),
        calculateSlippageMargin(foxAmount, foxAsset.precision),
        calculateSlippageMargin(ethAmount, ethAsset.precision),
        accountId,
        Date.now() + 1200000,
      ])
      const estimatedFees = await (adapter as unknown as EvmBaseAdapter<EvmChainId>).getFeeData({
        to: UNISWAP_V2_ROUTER_ADDRESS,
        value,
        chainSpecific: {
          contractData: data,
          from: fromAccountId(accountId).account,
        },
      })
      return estimatedFees
    },
    [skip, accountId, uniswapRouterContract, ethAsset.precision, foxAsset.precision, adapter],
  )

  const getWithdrawGasData = useCallback(
    async (lpAmount: string, foxAmount: string, ethAmount: string) => {
      if (skip || !accountId || !uniswapRouterContract) return
      const data = uniswapRouterContract.interface.encodeFunctionData('removeLiquidityETH', [
        FOX_TOKEN_CONTRACT_ADDRESS,
        bnOrZero(lpAmount).times(bn(10).exponentiatedBy(lpAsset.precision)).toFixed(0),
        calculateSlippageMargin(foxAmount, foxAsset.precision),
        calculateSlippageMargin(ethAmount, ethAsset.precision),
        fromAccountId(accountId).account,
        Date.now() + 1200000,
      ])
      const estimatedFees = await (adapter as unknown as EvmBaseAdapter<EvmChainId>).getFeeData({
        to: UNISWAP_V2_ROUTER_ADDRESS,
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
      uniswapRouterContract,
      lpAsset.precision,
      foxAsset.precision,
      ethAsset.precision,
      accountId,
      adapter,
    ],
  )

  const approve = useCallback(
    async (forWithdrawal?: boolean) => {
      if (skip || !wallet || !isNumber(accountNumber)) return
      const contract = forWithdrawal ? uniV2LPContract : foxContract
      const data = contract!.interface.encodeFunctionData('approve', [
        UNISWAP_V2_ROUTER_ADDRESS,
        MAX_ALLOWANCE,
      ])
      const gasData = await getApproveGasData(forWithdrawal)
      if (!gasData) return
      const fees = gasData.average as FeeData<EvmChainId>
      const {
        chainSpecific: { gasPrice, gasLimit },
      } = fees
      if (gasPrice === undefined) {
        throw new Error(`approve: missing gasPrice for non-EIP-1559 tx`)
      }
      const result = await (adapter as unknown as ethereum.ChainAdapter).buildCustomTx({
        to: contract!.address,
        value: '0x00',
        wallet,
        data,
        gasLimit,
        bip44Params: adapter.buildBIP44Params({
          accountNumber,
        }),
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
    [accountNumber, adapter, foxContract, getApproveGasData, skip, uniV2LPContract, wallet],
  )

  return {
    addLiquidity,
    allowance,
    approve,
    calculateHoldings,
    getApproveGasData,
    getDepositGasData,
    getLpTVL,
    getWithdrawGasData,
    removeLiquidity,
    getLpTokenPrice,
  }
}
