import { Box, Stack } from '@chakra-ui/react'
import type { AccountId } from '@shapeshiftoss/caip'
import { ASSET_REFERENCE, toAssetId } from '@shapeshiftoss/caip'
import { Confirm as ReusableConfirm } from 'features/defi/components/Confirm/Confirm'
import { PairIcons } from 'features/defi/components/PairIcons/PairIcons'
import { Summary } from 'features/defi/components/Summary'
import type {
  DefiParams,
  DefiQueryParams,
} from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { DefiStep } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { useFoxFarming } from 'features/defi/providers/fox-farming/hooks/useFoxFarming'
import { useCallback, useContext, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { Amount } from 'components/Amount/Amount'
import type { StepComponentProps } from 'components/DeFi/components/Steps'
import { Row } from 'components/Row/Row'
import { RawText, Text } from 'components/Text'
import { useFoxEth } from 'context/FoxEthProvider/FoxEthProvider'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'
import { useWallet } from 'hooks/useWallet/useWallet'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { logger } from 'lib/logger'
import { assertIsFoxEthStakingContractAddress } from 'state/slices/opportunitiesSlice/constants'
import {
  selectAssetById,
  selectMarketDataById,
  selectPortfolioCryptoHumanBalanceByFilter,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { FoxFarmingWithdrawActionType } from '../WithdrawCommon'
import { WithdrawContext } from '../WithdrawContext'

const moduleLogger = logger.child({
  namespace: ['DeFi', 'Providers', 'FoxFarming', 'Withdraw', 'Confirm'],
})

type ConfirmProps = { accountId: AccountId | undefined } & StepComponentProps

export const Confirm: React.FC<ConfirmProps> = ({ accountId, onNext }) => {
  const { state, dispatch } = useContext(WithdrawContext)
  const translate = useTranslate()
  const { query } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const { chainId, contractAddress, rewardId } = query
  const opportunity = state?.opportunity

  assertIsFoxEthStakingContractAddress(contractAddress)

  const { unstake } = useFoxFarming(contractAddress)
  const { onOngoingFarmingTxIdChange } = useFoxEth()
  // Asset info
  const underlyingAsset = useAppSelector(state =>
    selectAssetById(state, opportunity?.underlyingAssetId ?? ''),
  )
  const feeAssetId = toAssetId({
    chainId,
    assetNamespace: 'slip44',
    assetReference: ASSET_REFERENCE.Ethereum,
  })
  const feeAsset = useAppSelector(state => selectAssetById(state, feeAssetId))
  if (!feeAsset) throw new Error(`Fee asset not found for AssetId ${feeAssetId}`)

  const feeMarketData = useAppSelector(state => selectMarketDataById(state, feeAssetId))

  // user info
  const { state: walletState } = useWallet()

  const feeAssetBalanceFilter = useMemo(
    () => ({ assetId: feeAsset?.assetId, accountId: accountId ?? '' }),
    [accountId, feeAsset?.assetId],
  )
  const feeAssetBalance = useAppSelector(s =>
    selectPortfolioCryptoHumanBalanceByFilter(s, feeAssetBalanceFilter),
  )

  const hasEnoughBalanceForGas = useMemo(
    () => bnOrZero(feeAssetBalance).minus(bnOrZero(state?.withdraw.estimatedGasCrypto)).gte(0),
    [feeAssetBalance, state?.withdraw.estimatedGasCrypto],
  )

  const handleConfirm = useCallback(async () => {
    try {
      if (!dispatch || !state?.userAddress || !rewardId || !walletState.wallet || state.loading)
        return
      dispatch({ type: FoxFarmingWithdrawActionType.SET_LOADING, payload: true })
      const txid = await unstake(state.withdraw.lpAmount, state.withdraw.isExiting)
      if (!txid) throw new Error(`Transaction failed`)
      dispatch({ type: FoxFarmingWithdrawActionType.SET_TXID, payload: txid })
      onOngoingFarmingTxIdChange(txid, contractAddress)
      onNext(DefiStep.Status)
      dispatch({ type: FoxFarmingWithdrawActionType.SET_LOADING, payload: false })
    } catch (error) {
      moduleLogger.error(error, { fn: 'handleConfirm' }, 'handleConfirm error')
    }
  }, [
    contractAddress,
    dispatch,
    onNext,
    onOngoingFarmingTxIdChange,
    rewardId,
    state?.loading,
    state?.userAddress,
    state?.withdraw.isExiting,
    state?.withdraw.lpAmount,
    unstake,
    walletState.wallet,
  ])

  if (!state || !dispatch || !underlyingAsset || !opportunity) return null

  return (
    <ReusableConfirm
      onCancel={() => onNext(DefiStep.Info)}
      headerText='modals.confirm.withdraw.header'
      onConfirm={handleConfirm}
      isDisabled={!hasEnoughBalanceForGas}
      loading={state.loading}
      loadingText={translate('common.confirm')}
    >
      <Summary>
        <Row variant='vert-gutter' p={4}>
          <Row.Label>
            <Text translation='modals.confirm.amountToWithdraw' />
          </Row.Label>
          <Row px={0} fontWeight='medium'>
            <Stack direction='row' alignItems='center'>
              <PairIcons
                icons={opportunity?.icons!}
                iconBoxSize='5'
                h='38px'
                p={1}
                borderRadius={8}
              />
              <RawText>{underlyingAsset.name}</RawText>
            </Stack>
            <Row.Value>
              <Amount.Crypto value={state.withdraw.lpAmount} symbol={underlyingAsset.symbol} />
            </Row.Value>
          </Row>
        </Row>
        <Row variant='gutter'>
          <Row.Label>
            <Text translation='modals.confirm.estimatedGas' />
          </Row.Label>
          <Row.Value>
            <Box textAlign='right'>
              <Amount.Fiat
                fontWeight='bold'
                value={bnOrZero(state.withdraw.estimatedGasCrypto)
                  .times(feeMarketData.price)
                  .toFixed(2)}
              />
              <Amount.Crypto
                color='gray.500'
                value={bnOrZero(state.withdraw.estimatedGasCrypto).toFixed(5)}
                symbol={feeAsset.symbol}
              />
            </Box>
          </Row.Value>
        </Row>
      </Summary>
    </ReusableConfirm>
  )
}
