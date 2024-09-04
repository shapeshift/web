import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import { ethAssetId, ethChainId, fromAccountId, fromAssetId, toAssetId } from '@shapeshiftoss/caip'
import { CONTRACT_INTERACTION } from '@shapeshiftoss/chain-adapters'
import {
  ContractType,
  getOrCreateContractByAddress,
  getOrCreateContractByType,
  UNISWAP_V2_ROUTER_02_CONTRACT_ADDRESS,
  WETH_TOKEN_CONTRACT_ADDRESS,
} from '@shapeshiftoss/contracts'
import { KnownChainIds } from '@shapeshiftoss/types'
import isNumber from 'lodash/isNumber'
import { useCallback, useMemo } from 'react'
import type { Address } from 'viem'
import { encodeFunctionData, getAddress, maxUint256 } from 'viem'
import { useLedgerOpenApp } from 'hooks/useLedgerOpenApp/useLedgerOpenApp'
import { useWallet } from 'hooks/useWallet/useWallet'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { fromBaseUnit, toBaseUnit } from 'lib/math'
import {
  assertGetEvmChainAdapter,
  buildAndBroadcast,
  createBuildCustomTxInput,
  getFeesWithWalletEIP1559Support,
} from 'lib/utils/evm'
import { uniswapV2Router02AssetId } from 'state/slices/opportunitiesSlice/constants'
import {
  selectAccountNumberByAccountId,
  selectAssetById,
  selectMarketDataByAssetIdUserCurrency,
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
  const checkLedgerAppOpenIfLedgerConnected = useLedgerOpenApp({ isSigning: true })

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
  const asset0Price = useAppSelector(state =>
    selectMarketDataByAssetIdUserCurrency(state, assetId0OrWeth),
  ).price

  const adapter = useMemo(() => assertGetEvmChainAdapter(ethChainId), [])

  const uniswapRouterContract = useMemo(
    () => (skip ? null : getOrCreateContractByAddress(UNISWAP_V2_ROUTER_02_CONTRACT_ADDRESS)),
    [skip],
  )

  // Checksummed addresses
  const asset0ContractAddress = useMemo(
    () => getAddress(fromAssetId(assetId0OrWeth).assetReference),
    [assetId0OrWeth],
  )
  const asset1ContractAddress = useMemo(
    () => getAddress(fromAssetId(assetId1OrWeth).assetReference),
    [assetId1OrWeth],
  )

  const lpContractAddress = useMemo(
    () => getAddress(fromAssetId(lpAssetId).assetReference),
    [lpAssetId],
  )

  const asset0Contract = useMemo(() => {
    return skip
      ? null
      : getOrCreateContractByType({
          address: asset0ContractAddress,
          type: ContractType.ERC20,
          chainId: KnownChainIds.EthereumMainnet,
        })
  }, [asset0ContractAddress, skip])

  const asset1Contract = useMemo(() => {
    return skip
      ? null
      : getOrCreateContractByType({
          address: asset1ContractAddress,
          type: ContractType.ERC20,
          chainId: KnownChainIds.EthereumMainnet,
        })
  }, [asset1ContractAddress, skip])

  const uniV2LPContract = useMemo(() => {
    return skip
      ? null
      : getOrCreateContractByType({
          address: lpContractAddress,
          type: ContractType.UniV2Pair,
          chainId: KnownChainIds.EthereumMainnet,
        })
  }, [lpContractAddress, skip])

  const accountAddress = useMemo(() => getAddress(fromAccountId(accountId).account), [accountId])

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

        const data = encodeFunctionData({
          abi: uniswapRouterContract.abi,
          functionName: 'addLiquidityETH',
          args: [
            otherAssetContractAddress,
            BigInt(toBaseUnit(otherAssetAmount, otherAsset.precision)),
            BigInt(amountOtherAssetMin),
            BigInt(amountEthMin),
            accountAddress,
            BigInt(deadline),
          ],
        })
        return data
      } else {
        const amountAsset0Min = calculateSlippageMargin(token0Amount, asset0.precision)
        const amountAsset1Min = calculateSlippageMargin(token1Amount, asset1.precision)

        const data = encodeFunctionData({
          abi: uniswapRouterContract.abi,
          functionName: 'addLiquidity',
          args: [
            asset0ContractAddress,
            asset1ContractAddress,
            BigInt(toBaseUnit(token0Amount, asset0.precision)),
            BigInt(toBaseUnit(token1Amount, asset1.precision)),
            BigInt(amountAsset0Min),
            BigInt(amountAsset1Min),
            accountAddress,
            BigInt(deadline),
          ],
        })
        return data
      }
    },
    [
      accountAddress,
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

        await checkLedgerAppOpenIfLedgerConnected(fromAssetId(assetId0OrWeth).chainId)

        const maybeEthAmount = (() => {
          if (assetId0OrWeth === wethAssetId) return token0Amount
          if (assetId1OrWeth === wethAssetId) return token1Amount
          return '0'
        })()

        const buildCustomTxInput = await createBuildCustomTxInput({
          accountNumber,
          from: accountAddress,
          adapter,
          data: makeAddLiquidityData({ token0Amount, token1Amount }),
          to: fromAssetId(uniswapV2Router02AssetId).assetReference,
          value: toBaseUnit(maybeEthAmount, weth.precision),
          wallet,
        })

        const txid = await buildAndBroadcast({
          adapter,
          buildCustomTxInput,
          receiverAddress: CONTRACT_INTERACTION, // no receiver
        })

        return txid
      } catch (err) {
        console.error(err)
      }
    },
    [
      accountAddress,
      accountNumber,
      adapter,
      assetId0OrWeth,
      assetId1OrWeth,
      checkLedgerAppOpenIfLedgerConnected,
      makeAddLiquidityData,
      skip,
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
      asset0ContractAddress: Address
      asset1ContractAddress: Address
      lpAmount: string
      asset1Amount: string
      asset0Amount: string
    }) => {
      if (!uniswapRouterContract) throw new Error('uniswapRouterContract not defined')

      const deadline = Date.now() + 1200000 // 20 minutes from now
      const to = getAddress(fromAccountId(accountId).account)

      if ([assetId0OrWeth, assetId1OrWeth].includes(wethAssetId)) {
        const otherAssetContractAddress =
          assetId0OrWeth === wethAssetId ? asset1ContractAddress : asset0ContractAddress
        const otherAsset = assetId0OrWeth === wethAssetId ? asset1 : asset0
        const ethAmount = assetId0OrWeth === wethAssetId ? asset0Amount : asset1Amount
        const otherAssetAmount = assetId0OrWeth === wethAssetId ? asset1Amount : asset0Amount
        const data = encodeFunctionData({
          abi: uniswapRouterContract.abi,
          functionName: 'removeLiquidityETH',
          args: [
            otherAssetContractAddress,
            BigInt(toBaseUnit(lpAmount, lpAsset.precision)),
            BigInt(calculateSlippageMargin(otherAssetAmount, otherAsset.precision)),
            BigInt(calculateSlippageMargin(ethAmount, weth.precision)),
            to,
            BigInt(deadline),
          ],
        })

        return data
      }

      const data = encodeFunctionData({
        abi: uniswapRouterContract.abi,
        functionName: 'removeLiquidity',
        args: [
          asset0ContractAddress,
          asset1ContractAddress,
          BigInt(toBaseUnit(lpAmount, lpAsset.precision)),
          BigInt(calculateSlippageMargin(asset0Amount, asset0.precision)),
          BigInt(calculateSlippageMargin(asset1Amount, asset1.precision)),
          to,
          BigInt(deadline),
        ],
      })

      return data
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

        await checkLedgerAppOpenIfLedgerConnected(fromAssetId(assetId0OrWeth).chainId)

        const data = makeRemoveLiquidityData({
          asset0ContractAddress,
          asset1ContractAddress,
          lpAmount,
          asset1Amount,
          asset0Amount,
        })

        const buildCustomTxInput = await createBuildCustomTxInput({
          accountNumber,
          from: accountAddress,
          adapter,
          data,
          to: fromAssetId(uniswapV2Router02AssetId).assetReference,
          value: '0',
          wallet,
        })

        const txid = await buildAndBroadcast({
          adapter,
          buildCustomTxInput,
          receiverAddress: await adapter.getAddress({ accountNumber, wallet }),
        })

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
      checkLedgerAppOpenIfLedgerConnected,
      assetId0OrWeth,
      makeRemoveLiquidityData,
      asset0ContractAddress,
      asset1ContractAddress,
      accountAddress,
      adapter,
    ],
  )

  const calculateHoldings = useCallback(async () => {
    if (skip || !uniV2LPContract || !accountId) return

    const balance = await uniV2LPContract.read.balanceOf([
      getAddress(fromAccountId(accountId).account),
    ])
    const totalSupply = await uniV2LPContract.read.totalSupply()
    const reserves = await uniV2LPContract.read.getReserves()

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

    const reserves = await uniV2LPContract.read.getReserves()

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
    const totalSupply = await uniV2LPContract.read.totalSupply()

    return bnOrZero(tvl).div(fromBaseUnit(totalSupply.toString(), lpAsset.precision))
  }, [skip, getLpTVL, lpAsset.precision, uniV2LPContract])

  // TODO(gomes): consolidate me
  const asset0Allowance = useCallback(async () => {
    if (skip || !accountId || !asset0Contract) return

    const contractAddress = getAddress(fromAssetId(uniswapV2Router02AssetId).assetReference)
    const _allowance = await asset0Contract.read.allowance([accountAddress, contractAddress])

    return _allowance.toString()
  }, [skip, accountId, asset0Contract, accountAddress])

  const asset1Allowance = useCallback(async () => {
    if (skip || !accountId || !asset1Contract) return

    const contractAddress = getAddress(fromAssetId(uniswapV2Router02AssetId).assetReference)
    const _allowance = await asset1Contract.read.allowance([accountAddress, contractAddress])

    return _allowance.toString()
  }, [skip, accountId, asset1Contract, accountAddress])

  const lpAllowance = useCallback(async () => {
    if (skip || !accountId || !uniV2LPContract) return

    const contractAddress = getAddress(fromAssetId(uniswapV2Router02AssetId).assetReference)
    const _allowance = await uniV2LPContract.read.allowance([accountAddress, contractAddress])

    return _allowance.toString()
  }, [skip, accountId, uniV2LPContract, accountAddress])

  const getApproveFees = useCallback(
    (contractAddress: Address) => {
      if (skip || !isNumber(accountNumber) || !wallet) return

      const contract = getOrCreateContractByType({
        address: contractAddress,
        type: ContractType.ERC20,
        chainId: KnownChainIds.EthereumMainnet,
      })

      if (!contract) return

      const data = encodeFunctionData({
        abi: contract.abi,
        functionName: 'approve',
        args: [getAddress(fromAssetId(uniswapV2Router02AssetId).assetReference), maxUint256],
      })

      return getFeesWithWalletEIP1559Support({
        adapter,
        data,
        to: contract.address,
        from: accountAddress,
        value: '0',
        wallet,
      })
    },
    [skip, accountNumber, wallet, adapter, accountAddress],
  )

  const getDepositFees = useCallback(
    ({ token0Amount, token1Amount }: { token0Amount: string; token1Amount: string }) => {
      if (skip || !accountId || !isNumber(accountNumber) || !uniswapRouterContract || !wallet)
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

        const amountOtherAssetMin = calculateSlippageMargin(otherAssetAmount, otherAsset.precision)
        const amountEthMin = calculateSlippageMargin(ethAmount, weth.precision)

        const data = encodeFunctionData({
          abi: uniswapRouterContract.abi,
          functionName: 'addLiquidityETH',
          args: [
            otherAssetContractAddress,
            BigInt(toBaseUnit(otherAssetAmount, otherAsset.precision)),
            BigInt(amountOtherAssetMin),
            BigInt(amountEthMin),
            accountAddress,
            BigInt(deadline),
          ],
        })

        return getFeesWithWalletEIP1559Support({
          adapter,
          data,
          to: fromAssetId(uniswapV2Router02AssetId).assetReference,
          from: accountAddress,
          value: toBaseUnit(ethAmount, weth.precision),
          wallet,
        })
      } else {
        const amountAsset0Min = calculateSlippageMargin(token0Amount, asset0.precision)
        const amountAsset1Min = calculateSlippageMargin(token1Amount, asset1.precision)

        const data = encodeFunctionData({
          abi: uniswapRouterContract.abi,
          functionName: 'addLiquidity',
          args: [
            asset0ContractAddress,
            asset1ContractAddress,
            BigInt(toBaseUnit(token0Amount, asset0.precision)),
            BigInt(toBaseUnit(token1Amount, asset1.precision)),
            BigInt(amountAsset0Min),
            BigInt(amountAsset1Min),
            accountAddress,
            BigInt(deadline),
          ],
        })

        return getFeesWithWalletEIP1559Support({
          adapter,
          data,
          to: fromAssetId(uniswapV2Router02AssetId).assetReference,
          from: accountAddress,
          value: '0',
          wallet,
        })
      }
    },
    [
      skip,
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
      accountAddress,
      adapter,
    ],
  )

  const getWithdrawFees = useCallback(
    (lpAmount: string, asset0Amount: string, asset1Amount: string) => {
      if (skip || !isNumber(accountNumber) || !uniswapRouterContract || !wallet) return

      const data = makeRemoveLiquidityData({
        lpAmount,
        asset0Amount,
        asset1Amount,
        asset0ContractAddress,
        asset1ContractAddress,
      })

      return getFeesWithWalletEIP1559Support({
        adapter,
        data,
        to: fromAssetId(uniswapV2Router02AssetId).assetReference,
        from: accountAddress,
        value: '0',
        wallet,
      })
    },
    [
      skip,
      accountNumber,
      uniswapRouterContract,
      wallet,
      makeRemoveLiquidityData,
      asset0ContractAddress,
      asset1ContractAddress,
      adapter,
      accountAddress,
    ],
  )

  const approveAsset = useCallback(
    async (contractAddress: Address) => {
      if (skip || !wallet || !isNumber(accountNumber)) return

      // UNI-V2 is hardcoded to Ethereum Mainnet
      await checkLedgerAppOpenIfLedgerConnected(ethChainId)

      const contract = getOrCreateContractByType({
        address: contractAddress,
        type: ContractType.ERC20,
        chainId: KnownChainIds.EthereumMainnet,
      })

      if (!contract) return

      const uniV2ContractAddress = getAddress(fromAssetId(uniswapV2Router02AssetId).assetReference)
      const data = encodeFunctionData({
        abi: contract.abi,
        functionName: 'approve',
        args: [uniV2ContractAddress, maxUint256],
      })

      const fees = await getApproveFees(contractAddress)
      if (!fees) return

      const txid = await buildAndBroadcast({
        adapter,
        receiverAddress: CONTRACT_INTERACTION, // no receiver
        buildCustomTxInput: {
          accountNumber,
          to: contractAddress,
          value: '0',
          data,
          wallet,
          ...fees,
        },
      })

      return txid
    },
    [accountNumber, adapter, checkLedgerAppOpenIfLedgerConnected, getApproveFees, skip, wallet],
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
