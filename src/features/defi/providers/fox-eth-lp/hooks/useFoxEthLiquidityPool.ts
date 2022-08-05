import { Contract } from '@ethersproject/contracts'
import { ethAssetId } from '@shapeshiftoss/caip'
import {
  ChainAdapter,
  ethereum,
  EvmBaseAdapter,
  EvmChainId,
  FeeData,
} from '@shapeshiftoss/chain-adapters'
import { supportsETH } from '@shapeshiftoss/hdwallet-core'
import { KnownChainIds } from '@shapeshiftoss/types'
import IUniswapV2Pair from '@uniswap/v2-core/build/IUniswapV2Pair.json'
import IUniswapV2Router02ABI from '@uniswap/v2-periphery/build/IUniswapV2Router02.json'
import { FOX_TOKEN_CONTRACT_ADDRESS } from 'plugins/foxPage/const'
import { getEthersProvider } from 'plugins/foxPage/utils'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { useEvm } from 'hooks/useEvm/useEvm'
import { useWallet } from 'hooks/useWallet/useWallet'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { selectAssetById, selectMarketDataById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import erc20abi from '../abis/erc20abi.json'
import {
  MAX_ALLOWANCE,
  UNISWAP_V2_ROUTER_ADDRESS,
  UNISWAP_V2_WETH_FOX_POOL_ADDRESS,
} from '../const'

const ethersProvider = getEthersProvider()
function calculateSlippageMargin(amount: string | null) {
  if (!amount) throw new Error('Amount not given for slippage')
  const percentage = 3
  const remainingPercentage = (100 - percentage) / 100
  return bnOrZero(amount).times(bnOrZero(remainingPercentage)).decimalPlaces(0).toFixed()
}

export const useFoxEthLiquidityPool = () => {
  const [connectedWalletEthAddress, setConnectedWalletEthAddress] = useState<string | null>(null)
  const { supportedEvmChainIds } = useEvm()
  const ethAsset = useAppSelector(state => selectAssetById(state, ethAssetId))
  const {
    state: { wallet },
  } = useWallet()
  const ethPrice = useAppSelector(state => selectMarketDataById(state, ethAssetId)).price

  const chainAdapterManager = getChainAdapterManager()
  const adapter = chainAdapterManager.get(ethAsset.chainId) as ChainAdapter<KnownChainIds>

  useEffect(() => {
    if (wallet) {
      ;(async () => {
        const address = await adapter.getAddress({ wallet })
        setConnectedWalletEthAddress(address)
      })()
    }
  }, [adapter, wallet])

  const uniswapRouterContract = useMemo(
    () => new Contract(UNISWAP_V2_ROUTER_ADDRESS, IUniswapV2Router02ABI.abi, ethersProvider),
    [],
  )

  const foxContract = useMemo(
    () => new Contract(FOX_TOKEN_CONTRACT_ADDRESS, erc20abi, ethersProvider),
    [],
  )

  const uniV2LiquidityContractAddress = UNISWAP_V2_WETH_FOX_POOL_ADDRESS

  const uniV2LPContract = useMemo(
    () => new Contract(uniV2LiquidityContractAddress, IUniswapV2Pair.abi, ethersProvider),
    [uniV2LiquidityContractAddress],
  )

  const addLiquidity = useCallback(
    async (foxAmount: string, ethAmount: string) => {
      try {
        if (!connectedWalletEthAddress || !uniswapRouterContract || !wallet) return
        if (!adapter)
          throw new Error(`addLiquidityEth: no adapter available for ${ethAsset.chainId}`)
        const value = bnOrZero(ethAmount)
          .times(bnOrZero(10).exponentiatedBy(ethAsset.precision))
          .toFixed(0)
        const data = uniswapRouterContract?.interface.encodeFunctionData('addLiquidityETH', [
          FOX_TOKEN_CONTRACT_ADDRESS,
          foxAmount,
          calculateSlippageMargin(foxAmount),
          calculateSlippageMargin(ethAmount),
          connectedWalletEthAddress,
          Date.now() + 1200000,
        ])
        const adapterType = adapter.getChainId()
        const estimatedFees = await (adapter as unknown as EvmBaseAdapter<EvmChainId>).getFeeData({
          to: UNISWAP_V2_ROUTER_ADDRESS,
          value,
          chainSpecific: {
            contractData: data,
            from: connectedWalletEthAddress,
            contractAddress: FOX_TOKEN_CONTRACT_ADDRESS,
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
              value,
              wallet,
              data,
              gasLimit,
              bip44Params: adapter.buildBIP44Params({
                accountNumber: 0,
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
        console.warn(error)
      }
    },
    [
      adapter,
      connectedWalletEthAddress,
      ethAsset.chainId,
      ethAsset.precision,
      supportedEvmChainIds,
      uniswapRouterContract,
      wallet,
    ],
  )

  const removeLiquidity = useCallback(
    async (foxAmount: string, ethAmount: string, lpAmount: string) => {
      try {
        if (!connectedWalletEthAddress || !uniswapRouterContract || !wallet) return
        const chainAdapterManager = getChainAdapterManager()
        const adapter = chainAdapterManager.get(ethAsset.chainId) as ChainAdapter<KnownChainIds>
        if (!adapter)
          throw new Error(`addLiquidityEth: no adapter available for ${ethAsset.chainId}`)
        const value = bnOrZero(ethAmount)
          .times(bnOrZero(10).exponentiatedBy(ethAsset.precision))
          .toFixed(0)
        const data = uniswapRouterContract?.interface.encodeFunctionData('removeLiquidityETH', [
          FOX_TOKEN_CONTRACT_ADDRESS,
          lpAmount,
          calculateSlippageMargin(foxAmount),
          calculateSlippageMargin(ethAmount),
          connectedWalletEthAddress,
          Date.now() + 1200000,
        ])
        const adapterType = adapter.getChainId()
        const estimatedFees = await (adapter as unknown as EvmBaseAdapter<EvmChainId>).getFeeData({
          to: UNISWAP_V2_ROUTER_ADDRESS,
          value,
          chainSpecific: {
            contractData: data,
            from: connectedWalletEthAddress,
            contractAddress: FOX_TOKEN_CONTRACT_ADDRESS,
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
              value,
              wallet,
              data,
              gasLimit,
              bip44Params: adapter.buildBIP44Params({
                accountNumber: 0,
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
        console.warn(error)
      }
    },
    [
      connectedWalletEthAddress,
      ethAsset.chainId,
      ethAsset.precision,
      supportedEvmChainIds,
      uniswapRouterContract,
      wallet,
    ],
  )

  const calculateHoldings = useCallback(async () => {
    if (uniV2LPContract && connectedWalletEthAddress) {
      const balance = await uniV2LPContract.balanceOf(connectedWalletEthAddress)
      return balance
    }
  }, [uniV2LPContract, connectedWalletEthAddress])

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

  const allowance = useCallback(async () => {
    const _allowance = await foxContract.allowance(
      connectedWalletEthAddress,
      UNISWAP_V2_ROUTER_ADDRESS,
    )
    console.info(_allowance)
    return _allowance
  }, [connectedWalletEthAddress, foxContract])

  const getApproveGasData = useCallback(async () => {
    if (adapter && connectedWalletEthAddress && foxContract) {
      const data = foxContract.interface.encodeFunctionData('approve', [
        UNISWAP_V2_ROUTER_ADDRESS,
        MAX_ALLOWANCE,
      ])
      const fees = await (adapter as unknown as EvmBaseAdapter<EvmChainId>).getFeeData({
        to: FOX_TOKEN_CONTRACT_ADDRESS,
        value: '0',
        chainSpecific: {
          contractData: data,
          from: connectedWalletEthAddress,
          contractAddress: FOX_TOKEN_CONTRACT_ADDRESS,
        },
      })
      return fees
    }
  }, [adapter, connectedWalletEthAddress, foxContract])

  return {
    addLiquidity,
    removeLiquidity,
    calculateHoldings,
    getLpTVL,
    allowance,
    getApproveGasData,
  }
}
