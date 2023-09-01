import { useToast } from '@chakra-ui/react'
import type { AccountId } from '@shapeshiftoss/caip'
import { fromAccountId, fromAssetId, toAssetId } from '@shapeshiftoss/caip'
import type { EvmChainAdapter, EvmChainId, GetFeeDataInput } from '@shapeshiftoss/chain-adapters'
import { getConfig } from 'config'
import { getOrCreateContractByType } from 'contracts/contractManager'
import { ContractType } from 'contracts/types'
import { Approve as ReusableApprove } from 'features/defi/components/Approve/Approve'
import { ApprovePreFooter } from 'features/defi/components/Approve/ApprovePreFooter'
import type { DepositValues } from 'features/defi/components/Deposit/Deposit'
import type {
  DefiParams,
  DefiQueryParams,
} from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { DefiAction, DefiStep } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { canCoverTxFees } from 'features/defi/helpers/utils'
import debounce from 'lodash/debounce'
import { useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router-dom'
import type { StepComponentProps } from 'components/DeFi/components/Steps'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'
import { usePoll } from 'hooks/usePoll/usePoll'
import { useWallet } from 'hooks/useWallet/useWallet'
import type { Asset } from 'lib/asset-service'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { toBaseUnit } from 'lib/math'
import { THORCHAIN_FIXED_PRECISION } from 'lib/swapper/swappers/ThorchainSwapper/utils/constants'
import { getInboundAddressDataForChain } from 'lib/swapper/swappers/ThorchainSwapper/utils/getInboundAddressDataForChain'
import { assetIdToPoolAssetId } from 'lib/swapper/swappers/ThorchainSwapper/utils/poolAssetHelpers/poolAssetHelpers'
import { isSome } from 'lib/utils'
import { buildAndBroadcast, createBuildCustomTxInput } from 'lib/utils/evm'
import { getMaybeThorchainSaversDepositQuote } from 'state/slices/opportunitiesSlice/resolvers/thorchainsavers/utils'
import { DefiProvider } from 'state/slices/opportunitiesSlice/types'
import {
  selectAccountNumberByAccountId,
  selectAssetById,
  selectFeeAssetById,
  selectMarketDataById,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { DepositContext } from '../DepositContext'

type ApproveProps = StepComponentProps & { accountId: AccountId | undefined }

export const Approve: React.FC<ApproveProps> = ({ accountId, onNext }) => {
  const { poll } = usePoll()
  const { state, dispatch } = useContext(DepositContext)
  const estimatedGasCryptoPrecision = state?.approve.estimatedGasCryptoPrecision
  const history = useHistory()
  const translate = useTranslate()
  const toast = useToast()
  const [saversRouterContractAddress, setSaversRouterContractAddress] = useState<string | null>(
    null,
  )

  // user info
  const {
    state: { wallet },
  } = useWallet()

  const userAddress: string | undefined = accountId && fromAccountId(accountId).account
  const accountNumberFilter = useMemo(() => ({ accountId }), [accountId])
  const accountNumber = useAppSelector(state =>
    selectAccountNumberByAccountId(state, accountNumberFilter),
  )
  const chainAdapterManager = getChainAdapterManager()

  const { query } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const { chainId, assetNamespace, assetReference } = query
  const assetId = toAssetId({
    chainId,
    assetNamespace,
    assetReference,
  })
  const asset: Asset | undefined = useAppSelector(state => selectAssetById(state, assetId ?? ''))
  const feeAsset = useAppSelector(state => selectFeeAssetById(state, assetId))

  if (!asset) throw new Error(`Asset not found for AssetId ${assetId}`)
  if (!feeAsset) throw new Error(`Fee asset not found for AssetId ${assetId}`)

  const feeMarketData = useAppSelector(state =>
    selectMarketDataById(state, feeAsset?.assetId ?? ''),
  )

  const getDepositGasEstimateCryptoPrecision = useCallback(
    async (deposit: DepositValues): Promise<string | undefined> => {
      if (!(userAddress && assetReference && accountId)) return
      try {
        const amountCryptoBaseUnit = bnOrZero(deposit.cryptoAmount).times(
          bn(10).pow(asset.precision),
        )
        const maybeQuote = await getMaybeThorchainSaversDepositQuote({
          asset,
          amountCryptoBaseUnit,
        })
        if (maybeQuote.isErr()) throw new Error(maybeQuote.unwrapErr())
        const quote = maybeQuote.unwrap()

        const chainAdapters = getChainAdapterManager()
        const adapter = chainAdapters.get(chainId) as unknown as EvmChainAdapter
        const getFeeDataInput: GetFeeDataInput<EvmChainId> = {
          to: quote.inbound_address,
          value: amountCryptoBaseUnit.toFixed(0),
          chainSpecific: {
            from: userAddress,
          },
          sendMax: Boolean(state?.deposit.sendMax),
        }
        const fastFeeCryptoBaseUnit = (await adapter.getFeeData(getFeeDataInput)).fast.txFee

        const fastFeeCryptoPrecision = bnOrZero(
          bn(fastFeeCryptoBaseUnit).div(bn(10).pow(asset.precision)),
        )
        return bnOrZero(fastFeeCryptoPrecision).toString()
      } catch (error) {
        console.error(error)
        toast({
          position: 'top-right',
          description: translate('common.somethingWentWrongBody'),
          title: translate('common.somethingWentWrong'),
          status: 'error',
        })
      }
    },
    [
      userAddress,
      assetReference,
      accountId,
      asset,
      chainId,
      state?.deposit.sendMax,
      toast,
      translate,
    ],
  )

  const handleApprove = useCallback(async () => {
    if (!state?.deposit.cryptoAmount || accountNumber === undefined || !wallet) return

    const daemonUrl = getConfig().REACT_APP_THORCHAIN_NODE_URL
    // TODO(gomes): fetch and set state field for evm tokens only
    const maybeInboundAddressData = await getInboundAddressDataForChain(
      daemonUrl,
      feeAsset?.assetId,
    )
    if (maybeInboundAddressData.isErr())
      throw new Error(maybeInboundAddressData.unwrapErr().message)

    const amountCryptoBaseUnit = bnOrZero(state.deposit.cryptoAmount).times(
      bn(10).pow(asset.precision),
    )

    const maybeQuote = await getMaybeThorchainSaversDepositQuote({
      asset,
      amountCryptoBaseUnit,
    })
    if (maybeQuote.isErr()) throw new Error(maybeQuote.unwrapErr())
    const quote = maybeQuote.unwrap()

    const inboundAddressData = maybeInboundAddressData.unwrap()
    // Guaranteed to be defined for EVM chains, and approve are only for EVM chains
    const router = inboundAddressData.router!
    const poolId = assetIdToPoolAssetId({ assetId: asset.assetId })

    if (!poolId) throw new Error(`poolId not found for assetId ${asset.assetId}`)

    const thorContract = getOrCreateContractByType({
      address: router,
      type: ContractType.ThorRouter,
      chainId: asset.chainId,
    })

    const amountCryptoThorBaseunit = toBaseUnit(
      state.deposit.cryptoAmount,
      THORCHAIN_FIXED_PRECISION,
    )

    const data = thorContract.interface.encodeFunctionData('depositWithExpiry', [
      quote.inbound_address,
      fromAssetId(assetId).assetReference,
      amountCryptoThorBaseunit,
      quote.memo,
      quote.expiry,
    ])

    const adapter = chainAdapterManager.get(asset.chainId) as unknown as EvmChainAdapter
    const buildCustomTxInput = await createBuildCustomTxInput({
      accountNumber,
      adapter,
      data,
      value: '0',
      to: router,
      wallet,
    })

    const txid = await buildAndBroadcast({ adapter, buildCustomTxInput })
  }, [
    accountNumber,
    asset,
    assetId,
    chainAdapterManager,
    feeAsset?.assetId,
    state?.deposit.cryptoAmount,
    wallet,
  ])

  const hasEnoughBalanceForGas = useMemo(
    () =>
      isSome(accountId) &&
      isSome(estimatedGasCryptoPrecision) &&
      canCoverTxFees({
        feeAsset,
        estimatedGasCryptoPrecision,
        accountId,
      }),
    [accountId, feeAsset, estimatedGasCryptoPrecision],
  )

  const preFooter = useMemo(
    () => (
      <ApprovePreFooter
        accountId={accountId}
        action={DefiAction.Deposit}
        feeAsset={feeAsset}
        estimatedGasCryptoPrecision={estimatedGasCryptoPrecision}
      />
    ),
    [accountId, feeAsset, estimatedGasCryptoPrecision],
  )

  if (!state || !dispatch) return null

  return (
    <ReusableApprove
      asset={asset}
      spenderName={DefiProvider.ThorchainSavers}
      feeAsset={feeAsset}
      estimatedGasFeeCryptoPrecision={bnOrZero(estimatedGasCryptoPrecision)
        .div(bn(10).pow(feeAsset.precision))
        .toFixed(5)}
      disabled={!hasEnoughBalanceForGas}
      fiatEstimatedGasFee={bnOrZero(estimatedGasCryptoPrecision)
        .div(bn(10).pow(feeAsset.precision))
        .times(feeMarketData.price)
        .toFixed(2)}
      loading={state.loading}
      loadingText={translate('common.approve')}
      learnMoreLink='https://shapeshift.zendesk.com/hc/en-us/articles/360018501700'
      preFooter={preFooter}
      isExactAllowance={state.isExactAllowance}
      onCancel={() => history.push('/')}
      onConfirm={handleApprove}
      spenderContractAddress={'0x'} // TODO
      onToggle={() => console.log('TODO')}
    />
  )
}
