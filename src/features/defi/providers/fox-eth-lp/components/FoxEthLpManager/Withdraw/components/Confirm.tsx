import { Alert, AlertIcon, Box, Stack } from '@chakra-ui/react'
import type { AccountId } from '@shapeshiftoss/caip'
import { ethAssetId, foxAssetId } from '@shapeshiftoss/caip'
import { supportsETH } from '@shapeshiftoss/hdwallet-core'
import { Confirm as ReusableConfirm } from 'features/defi/components/Confirm/Confirm'
import { PairIcons } from 'features/defi/components/PairIcons/PairIcons'
import { Summary } from 'features/defi/components/Summary'
import { DefiStep } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { useFoxEthLiquidityPool } from 'features/defi/providers/fox-eth-lp/hooks/useFoxEthLiquidityPool'
import { useCallback, useContext, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'
import type { StepComponentProps } from 'components/DeFi/components/Steps'
import { Row } from 'components/Row/Row'
import { RawText, Text } from 'components/Text'
import { useFoxEth } from 'context/FoxEthProvider/FoxEthProvider'
import { useWallet } from 'hooks/useWallet/useWallet'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { logger } from 'lib/logger'
import { foxEthLpAssetId } from 'state/slices/opportunitiesSlice/constants'
import {
  selectAssetById,
  selectMarketDataById,
  selectPortfolioCryptoHumanBalanceByFilter,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { FoxEthLpWithdrawActionType } from '../WithdrawCommon'
import { WithdrawContext } from '../WithdrawContext'

const moduleLogger = logger.child({ namespace: ['Confirm'] })

type ConfirmProps = { accountId: AccountId | undefined } & StepComponentProps

export const Confirm = ({ accountId, onNext }: ConfirmProps) => {
  const { state, dispatch } = useContext(WithdrawContext)
  const opportunity = state?.opportunity
  const translate = useTranslate()
  const { lpAccountId, onOngoingLpTxIdChange } = useFoxEth()
  const { removeLiquidity } = useFoxEthLiquidityPool(lpAccountId)

  const ethAsset = useAppSelector(state => selectAssetById(state, ethAssetId))
  const ethMarketData = useAppSelector(state => selectMarketDataById(state, ethAssetId))
  const foxAsset = useAppSelector(state => {
    return selectAssetById(state, foxAssetId)
  })
  const lpAsset = useAppSelector(state => selectAssetById(state, foxEthLpAssetId))

  if (!foxAsset) throw new Error(`Asset not found for AssetId ${foxAssetId}`)
  if (!ethAsset) throw new Error(`Asset not found for AssetId ${ethAssetId}`)
  if (!lpAsset) throw new Error(`Asset not found for AssetId ${foxEthLpAssetId}`)

  // user info
  const { state: walletState } = useWallet()

  const feeAssetBalanceFilter = useMemo(
    () => ({ assetId: ethAssetId, accountId: accountId ?? '' }),
    [accountId],
  )
  const feeAssetBalance = useAppSelector(s =>
    selectPortfolioCryptoHumanBalanceByFilter(s, feeAssetBalanceFilter),
  )

  const hasEnoughBalanceForGas = useMemo(
    () => bnOrZero(feeAssetBalance).minus(bnOrZero(state?.withdraw.estimatedGasCrypto)).gte(0),
    [feeAssetBalance, state?.withdraw.estimatedGasCrypto],
  )

  const handleCancel = useCallback(() => {
    onNext(DefiStep.Info)
  }, [onNext])

  const handleConfirm = useCallback(async () => {
    if (!(dispatch && walletState.wallet && supportsETH(walletState.wallet) && opportunity)) return
    try {
      dispatch({ type: FoxEthLpWithdrawActionType.SET_LOADING, payload: true })

      const txid = await removeLiquidity(
        state.withdraw.lpAmount,
        state.withdraw.foxAmount,
        state.withdraw.ethAmount,
      )
      if (!txid) throw new Error(`Transaction failed`)
      dispatch({ type: FoxEthLpWithdrawActionType.SET_TXID, payload: txid })
      onOngoingLpTxIdChange(txid)
      onNext(DefiStep.Status)
    } catch (error) {
      moduleLogger.error(error, 'FoxEthLpWithdraw:handleConfirm error')
    } finally {
      dispatch({ type: FoxEthLpWithdrawActionType.SET_LOADING, payload: false })
    }
  }, [
    dispatch,
    onNext,
    onOngoingLpTxIdChange,
    opportunity,
    removeLiquidity,
    state?.withdraw.ethAmount,
    state?.withdraw.foxAmount,
    state?.withdraw.lpAmount,
    walletState.wallet,
  ])

  if (!state || !dispatch || !opportunity) return null

  return (
    <ReusableConfirm
      onCancel={handleCancel}
      headerText='modals.confirm.withdraw.header'
      isDisabled={!hasEnoughBalanceForGas}
      loading={state.loading}
      loadingText={translate('common.confirm')}
      onConfirm={handleConfirm}
    >
      <Summary>
        <Row variant='vertical' p={4}>
          <Row.Label>
            <Text translation='modals.confirm.amountToWithdraw' />
          </Row.Label>
          <Row px={0} fontWeight='medium'>
            <Stack direction='row' alignItems='center'>
              <PairIcons
                icons={opportunity.icons!}
                iconBoxSize='5'
                h='38px'
                p={1}
                borderRadius={8}
              />
              <RawText>{lpAsset.name}</RawText>
            </Stack>
            <Row.Value>
              <Amount.Crypto value={state.withdraw.lpAmount} symbol={lpAsset.symbol} />
            </Row.Value>
          </Row>
        </Row>
        <Row variant='vertical' p={4}>
          <Row.Label>
            <Text translation='common.receive' />
          </Row.Label>
          <Row px={0} fontWeight='medium'>
            <Stack direction='row' alignItems='center'>
              <AssetIcon size='xs' src={foxAsset.icon} />
              <RawText>{foxAsset.name}</RawText>
            </Stack>
            <Row.Value>
              <Amount.Crypto value={state.withdraw.foxAmount} symbol={foxAsset.symbol} />
            </Row.Value>
          </Row>
          <Row px={0} fontWeight='medium'>
            <Stack direction='row' alignItems='center'>
              <AssetIcon size='xs' src={ethAsset.icon} />
              <RawText>{ethAsset.name}</RawText>
            </Stack>
            <Row.Value>
              <Amount.Crypto value={state.withdraw.ethAmount} symbol={ethAsset.symbol} />
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
                value={bnOrZero(state.withdraw.estimatedGasCrypto)
                  .times(ethMarketData.price)
                  .toFixed(2)}
              />
              <Amount.Crypto
                color='gray.500'
                value={bnOrZero(state.withdraw.estimatedGasCrypto).toFixed(5)}
                symbol={ethAsset.symbol}
              />
            </Box>
          </Row.Value>
        </Row>
        {!hasEnoughBalanceForGas && (
          <Alert status='error' borderRadius='lg'>
            <AlertIcon />
            <Text translation={['modals.confirm.notEnoughGas', { assetSymbol: ethAsset.symbol }]} />
          </Alert>
        )}
      </Summary>
    </ReusableConfirm>
  )
}
