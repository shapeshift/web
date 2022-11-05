import { Alert, AlertIcon, Box, Stack, useToast } from '@chakra-ui/react'
import type { AccountId } from '@keepkey/caip'
import { ASSET_REFERENCE, toAssetId } from '@keepkey/caip'
import { Confirm as ReusableConfirm } from 'features/defi/components/Confirm/Confirm'
import { Summary } from 'features/defi/components/Summary'
import type {
  DefiParams,
  DefiQueryParams,
} from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { DefiStep } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { StakingAction } from 'plugins/cosmos/components/modals/Staking/StakingCommon'
import { useStakingAction } from 'plugins/cosmos/hooks/useStakingAction/useStakingAction'
import { getFormFees } from 'plugins/cosmos/utils'
import { useCallback, useContext, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'
import type { StepComponentProps } from 'components/DeFi/components/Steps'
import { Row } from 'components/Row/Row'
import { RawText, Text } from 'components/Text'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'
import { useWallet } from 'hooks/useWallet/useWallet'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { logger } from 'lib/logger'
import {
  selectAssetById,
  selectBIP44ParamsByAccountId,
  selectMarketDataById,
  selectPortfolioCryptoHumanBalanceByFilter,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'
import type { Nullable } from 'types/common'

import { CosmosDepositActionType } from '../DepositCommon'
import { DepositContext } from '../DepositContext'

const moduleLogger = logger.child({
  namespace: ['DeFi', 'Providers', 'Cosmos', 'Deposit', 'Confirm'],
})

type ConfirmProps = StepComponentProps & { accountId?: Nullable<AccountId> }

export const Confirm: React.FC<ConfirmProps> = ({ onNext, accountId }) => {
  const { state, dispatch } = useContext(DepositContext)
  const translate = useTranslate()
  const { query } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const { chainId, contractAddress, assetReference } = query
  const assetNamespace = 'slip44'
  const assetId = toAssetId({ chainId, assetNamespace, assetReference })
  const feeAssetId = toAssetId({
    chainId,
    assetNamespace: 'slip44',
    assetReference: ASSET_REFERENCE.Cosmos,
  })

  const asset = useAppSelector(state => selectAssetById(state, assetId))
  const feeAsset = useAppSelector(state => selectAssetById(state, feeAssetId))
  const feeMarketData = useAppSelector(state => selectMarketDataById(state, feeAssetId))

  // user info
  const { state: walletState } = useWallet()

  // notify
  const toast = useToast()

  const filter = useMemo(
    () => ({ assetId: feeAsset?.assetId ?? '', accountId: accountId ?? '' }),
    [feeAsset?.assetId, accountId],
  )
  const feeAssetBalance = useAppSelector(state =>
    selectPortfolioCryptoHumanBalanceByFilter(state, filter),
  )

  const marketData = useAppSelector(state => selectMarketDataById(state, assetId))

  const { handleStakingAction } = useStakingAction()

  const accountFilter = useMemo(() => ({ accountId: accountId ?? '' }), [accountId])
  const bip44Params = useAppSelector(state => selectBIP44ParamsByAccountId(state, accountFilter))

  const handleDeposit = useCallback(async () => {
    if (!(state?.userAddress && dispatch && bip44Params && assetReference && walletState.wallet))
      return
    dispatch({ type: CosmosDepositActionType.SET_LOADING, payload: true })

    const { gasLimit, gasPrice } = await getFormFees(asset, marketData.price)

    try {
      const broadcastTxId = await handleStakingAction({
        asset,
        bip44Params,
        validator: contractAddress,
        chainSpecific: {
          gas: gasLimit,
          fee: bnOrZero(gasPrice).times(`1e+${asset?.precision}`).toString(),
        },
        value: bnOrZero(state.deposit.cryptoAmount).times(`1e+${asset.precision}`).toString(),
        action: StakingAction.Stake,
      })

      dispatch({
        type: CosmosDepositActionType.SET_DEPOSIT,
        payload: {
          txStatus: broadcastTxId?.length ? 'success' : 'failed',
        },
      })

      if (!broadcastTxId) {
        throw new Error() // TODO:
      }

      dispatch({ type: CosmosDepositActionType.SET_TXID, payload: broadcastTxId })
    } catch (error) {
      moduleLogger.error(error, { fn: 'handleDeposit' }, 'handleDeposit error')
      toast({
        position: 'top-right',
        description: translate('common.transactionFailedBody'),
        title: translate('common.transactionFailed'),
        status: 'error',
      })
    } finally {
      onNext(DefiStep.Status)
      dispatch({ type: CosmosDepositActionType.SET_LOADING, payload: false })
    }
  }, [
    asset,
    assetReference,
    bip44Params,
    contractAddress,
    dispatch,
    handleStakingAction,
    marketData,
    onNext,
    state?.deposit.cryptoAmount,
    state?.userAddress,
    toast,
    translate,
    walletState?.wallet,
  ])

  if (!state || !dispatch) return null

  const hasEnoughBalanceForGas = bnOrZero(feeAssetBalance).gte(
    bnOrZero(state.deposit.cryptoAmount).plus(
      bnOrZero(state.deposit.estimatedGasCrypto).div(`1e+${feeAsset.precision}`),
    ),
  )

  return (
    <ReusableConfirm
      onCancel={() => onNext(DefiStep.Info)}
      onConfirm={handleDeposit}
      loading={state.loading}
      loadingText={translate('common.confirm')}
      isDisabled={!hasEnoughBalanceForGas}
      headerText='modals.confirm.deposit.header'
    >
      <Summary>
        <Row variant='vertical' p={4}>
          <Row.Label>
            <Text translation='modals.confirm.amountToStake' />
          </Row.Label>
          <Row px={0} fontWeight='medium'>
            <Stack direction='row' alignItems='center'>
              <AssetIcon size='xs' src={asset.icon} />
              <RawText>{asset.name}</RawText>
            </Stack>
            <Row.Value>
              <Amount.Crypto value={state.deposit.cryptoAmount} symbol={asset.symbol} />
            </Row.Value>
          </Row>
        </Row>
        <Row p={4}>
          <Row.Label>
            <Text translation='modals.confirm.estimatedGas' />
          </Row.Label>
          <Row.Value>
            <Box textAlign='right'>
              <Amount.Fiat
                fontWeight='bold'
                value={bnOrZero(state.deposit.estimatedGasCrypto)
                  .div(`1e+${feeAsset.precision}`)
                  .times(feeMarketData.price)
                  .toFixed(2)}
              />
              <Amount.Crypto
                color='gray.500'
                value={bnOrZero(state.deposit.estimatedGasCrypto)
                  .div(`1e+${feeAsset.precision}`)
                  .toFixed(5)}
                symbol={feeAsset.symbol}
              />
            </Box>
          </Row.Value>
        </Row>
      </Summary>
      {!hasEnoughBalanceForGas && (
        <Alert status='error' borderRadius='lg'>
          <AlertIcon />
          <Text translation={['modals.confirm.notEnoughGas', { assetSymbol: feeAsset.symbol }]} />
        </Alert>
      )}
    </ReusableConfirm>
  )
}
