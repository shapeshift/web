import { Button, Card, CardBody, CardFooter, CardHeader, Heading, Link } from '@chakra-ui/react'
import { COW_SWAP_VAULT_RELAYER_ADDRESS } from '@shapeshiftoss/swapper'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import { bnOrZero, fromBaseUnit } from '@shapeshiftoss/utils'
import { useCallback, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router'
import { Amount } from 'components/Amount/Amount'
import { SlideTransition } from 'components/SlideTransition'
import { Text } from 'components/Text'
import type { TextPropTypes } from 'components/Text/Text'
import { useIsAllowanceResetRequired } from 'hooks/queries/useIsAllowanceResetRequired'
import { useSafeTxQuery } from 'hooks/queries/useSafeTx'
import { useErrorHandler } from 'hooks/useErrorToast/useErrorToast'
import { getTxLink } from 'lib/getTxLink'
import { selectActiveQuote } from 'state/slices/limitOrderSlice/selectors'
import type { LimitOrderActiveQuote } from 'state/slices/limitOrderSlice/types'
import {
  selectAssetById,
  selectFeeAssetById,
  selectPortfolioCryptoBalanceBaseUnitByFilter,
} from 'state/slices/selectors'
import { useAppSelector, useSelectorWithArgs } from 'state/store'

import { StatusBody } from '../../StatusBody'
import { WithBackButton } from '../../WithBackButton'
import { useAllowanceApproval } from '../hooks/useAllowanceApproval'
import { LimitOrderRoutePaths } from '../types'

const cardBorderRadius = { base: '2xl' }

const AllowanceApprovalInner = ({ activeQuote }: { activeQuote: LimitOrderActiveQuote }) => {
  const history = useHistory()
  const translate = useTranslate()
  const { showErrorToast } = useErrorHandler()
  const [txStatus, setTxStatus] = useState(TxStatus.Unknown)
  const [txHash, setTxHash] = useState('')

  const sellAsset = useSelectorWithArgs(selectAssetById, activeQuote.params.sellAssetId)
  const feeAsset = useSelectorWithArgs(selectFeeAssetById, sellAsset?.assetId ?? '')
  const filter = useMemo(
    () => ({
      accountId: activeQuote.params.accountId,
      assetId: feeAsset?.assetId ?? '',
    }),
    [activeQuote.params.accountId, feeAsset?.assetId],
  )
  const feeAssetBalance = useSelectorWithArgs(selectPortfolioCryptoBalanceBaseUnitByFilter, filter)

  const onMutate = useCallback(() => {
    setTxStatus(TxStatus.Pending)
  }, [])

  const onError = useCallback(
    (err: Error) => {
      showErrorToast(err)
      setTxStatus(TxStatus.Failed)
    },
    [showErrorToast],
  )

  const onSuccess = useCallback(() => {
    setTxStatus(TxStatus.Confirmed)
    history.push(LimitOrderRoutePaths.Confirm)
  }, [history])

  const {
    approveMutation,
    approvalNetworkFeeCryptoBaseUnit,
    isLoading: isAllowanceApprovalLoading,
  } = useAllowanceApproval({
    activeQuote,
    setTxHash,
    feeQueryEnabled: true,
    isInitiallyRequired: true,
    onMutate,
    onError,
    onSuccess,
  })

  const { isAllowanceResetRequired, isLoading: isAllowanceResetRequiredLoading } =
    useIsAllowanceResetRequired({
      assetId: activeQuote.params.sellAssetId,
      amountCryptoBaseUnit: activeQuote.params.sellAmountCryptoBaseUnit,
      from: activeQuote.params.sellAccountAddress,
      spender: COW_SWAP_VAULT_RELAYER_ADDRESS,
    })

  const isLoading = useMemo(() => {
    return (
      txStatus === TxStatus.Pending || isAllowanceApprovalLoading || isAllowanceResetRequiredLoading
    )
  }, [isAllowanceApprovalLoading, isAllowanceResetRequiredLoading, txStatus])

  const handleSignAndBroadcast = useCallback(async () => {
    await approveMutation.mutateAsync()
  }, [approveMutation])

  const handleGoBack = useCallback(() => {
    history.push(LimitOrderRoutePaths.Input)
  }, [history])

  const { data: maybeSafeTx } = useSafeTxQuery({
    maybeSafeTxHash: txHash,
    accountId: activeQuote.params.accountId,
  })

  const txLink = useMemo(() => {
    if (!feeAsset) return
    if (!txHash) return

    return getTxLink({
      defaultExplorerBaseUrl: feeAsset.explorerTxLink,
      maybeSafeTx,
      tradeId: txHash,
      accountId: activeQuote.params.accountId,
    })
  }, [activeQuote.params.accountId, feeAsset, maybeSafeTx, txHash])

  const hasSufficientBalanceForGas = useMemo(() => {
    if (approvalNetworkFeeCryptoBaseUnit === undefined) {
      return isLoading
    }

    return bnOrZero(feeAssetBalance).gte(approvalNetworkFeeCryptoBaseUnit)
  }, [approvalNetworkFeeCryptoBaseUnit, feeAssetBalance, isLoading])

  const approveAssetTranslation = useMemo(() => {
    return [
      'trade.approveAsset',
      { symbol: sellAsset?.symbol ?? '' },
    ] as TextPropTypes['translation']
  }, [sellAsset])

  const { buttonTranslation, isError } = useMemo(() => {
    if (!hasSufficientBalanceForGas) {
      return { buttonTranslation: 'limitOrder.errors.insufficientFundsForGas', isError: true }
    }

    return { buttonTranslation: approveAssetTranslation, isError: isAllowanceResetRequired }
  }, [approveAssetTranslation, hasSufficientBalanceForGas, isAllowanceResetRequired])

  const statusBody = useMemo(() => {
    const statusTranslation = (() => {
      switch (txStatus) {
        case TxStatus.Failed:
          return 'common.somethingWentWrong'
        case TxStatus.Pending:
        case TxStatus.Unknown:
        case TxStatus.Confirmed:
        default:
          return null
      }
    })()

    const defaultTitleTranslation = isAllowanceResetRequired
      ? 'limitOrder.usdtAllowanceReset.title'
      : approveAssetTranslation

    return (
      <StatusBody txStatus={txStatus} defaultTitleTranslation={defaultTitleTranslation}>
        <>
          <Text translation={statusTranslation} color='text.subtle' />
          {Boolean(isAllowanceResetRequired) && (
            <>
              <Text translation='limitOrder.usdtAllowanceReset.description' color='text.subtle' />
            </>
          )}
          {!isAllowanceResetRequired && txStatus === TxStatus.Unknown && (
            <>
              <Text translation='common.approvalFee' color='text.subtle' />
              {approvalNetworkFeeCryptoBaseUnit && feeAsset && (
                <Amount.Crypto
                  value={fromBaseUnit(approvalNetworkFeeCryptoBaseUnit, feeAsset?.precision)}
                  symbol={feeAsset?.symbol ?? ''}
                />
              )}
            </>
          )}
          {Boolean(txLink) && (
            <Button as={Link} href={txLink} size='sm' variant='link' colorScheme='blue' isExternal>
              {translate('limitOrder.viewOnChain')}
            </Button>
          )}
        </>
      </StatusBody>
    )
  }, [
    isAllowanceResetRequired,
    approvalNetworkFeeCryptoBaseUnit,
    approveAssetTranslation,
    feeAsset,
    translate,
    txLink,
    txStatus,
  ])

  return (
    <SlideTransition>
      <Card
        flex={1}
        borderRadius={cardBorderRadius}
        width='full'
        variant='dashboard'
        maxWidth='500px'
        borderColor='border.base'
        bg='background.surface.raised.base'
      >
        <CardHeader px={6} pt={4}>
          <WithBackButton onBack={handleGoBack}>
            <Heading textAlign='center' fontSize='md'>
              <Text translation='trade.allowance' />
            </Heading>
          </WithBackButton>
        </CardHeader>
        <CardBody py={32}>{statusBody}</CardBody>
        <CardFooter flexDir='row' gap={4} px={4} borderTopWidth={0}>
          <Button
            colorScheme={isError ? 'red' : 'blue'}
            size='lg'
            width='full'
            onClick={handleSignAndBroadcast}
            isLoading={isLoading}
            isDisabled={isLoading || isError}
          >
            <Text translation={buttonTranslation} />
          </Button>
        </CardFooter>
      </Card>
    </SlideTransition>
  )
}

export const AllowanceApproval = () => {
  const history = useHistory()
  const activeQuote = useAppSelector(selectActiveQuote)

  // This should never happen but for paranoia and typescript reasons:
  if (activeQuote === undefined) {
    console.error('Attempted to perform allowance approval on non-existent quote')
    history.push(LimitOrderRoutePaths.Input)
    return null
  }

  return <AllowanceApprovalInner activeQuote={activeQuote} />
}
