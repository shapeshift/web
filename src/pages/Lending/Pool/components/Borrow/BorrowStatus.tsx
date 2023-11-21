import { CheckIcon, ExternalLinkIcon } from '@chakra-ui/icons'
import { Box, Button, Link, Stack } from '@chakra-ui/react'
import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import { Summary } from 'features/defi/components/Summary'
import { TxStatus } from 'features/defi/components/TxStatus/TxStatus'
import { useCallback, useEffect, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'
import { HelperTooltip } from 'components/HelperTooltip/HelperTooltip'
import { StatusTextEnum } from 'components/RouteSteps/RouteSteps'
import { Row } from 'components/Row/Row'
import { SlideTransition } from 'components/SlideTransition'
import { RawText, Text } from 'components/Text'
import { queryClient } from 'context/QueryClientProvider/queryClient'
import type { Asset } from 'lib/asset-service'
import { waitForThorchainUpdate } from 'lib/utils/thorchain'
import { useLendingPositionData } from 'pages/Lending/hooks/useLendingPositionData'
import type { LendingQuoteData } from 'pages/Lending/hooks/useLendingQuoteQuery'
import { selectAssetById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { BorrowRoutePaths } from './types'

type BorrowStatusProps = {
  txHash: string | null
  collateralAssetId: AssetId
  borrowAsset: Asset
  collateralAccountId: AccountId
  depositAmountCryptoPrecision: string
  activeQuoteData: LendingQuoteData | null
}

const externalLinkIcon = <ExternalLinkIcon />

export const BorrowStatus = ({
  collateralAccountId,
  collateralAssetId,
  txHash,
  depositAmountCryptoPrecision,
  activeQuoteData,
  borrowAsset,
}: BorrowStatusProps) => {
  const translate = useTranslate()
  const [isLoanOpenPending, setIsLoanOpenPending] = useState(false)
  const history = useHistory()

  const handleBack = useCallback(() => {
    history.push(BorrowRoutePaths.Input)
  }, [history])

  const { refetch: refetchLendingPositionData } = useLendingPositionData({
    assetId: collateralAssetId,
    accountId: collateralAccountId,
  })

  useEffect(() => {
    // don't start polling until we have a tx
    if (!txHash) return

    setIsLoanOpenPending(true)
    ;(async () => {
      await waitForThorchainUpdate({ txHash, queryClient, skipOutbound: true }).promise
      setIsLoanOpenPending(false)
    })()
  }, [refetchLendingPositionData, txHash])

  const collateralAsset = useAppSelector(state => selectAssetById(state, collateralAssetId))

  const { statusIcon, statusText, statusBg } = (() => {
    switch (isLoanOpenPending) {
      case false:
        return {
          statusText: StatusTextEnum.success,
          statusIcon: <CheckIcon color='white' />,
          statusBg: 'green.500',
        }
      default:
        return {
          statusIcon: <AssetIcon size='xs' src={collateralAsset?.icon} />,
          statusText: StatusTextEnum.pending,
          statusBg: 'transparent',
        }
    }
  })()

  if (!(collateralAsset && activeQuoteData && txHash)) return null

  return (
    <SlideTransition>
      <TxStatus
        onClose={handleBack}
        onContinue={handleBack}
        loading={isLoanOpenPending}
        statusText={statusText}
        statusIcon={statusIcon}
        statusBg={statusBg}
        continueText='modals.status.position'
      >
        <Summary spacing={0} mx={6} mb={4}>
          <Row variant='vert-gutter'>
            <Row.Label>
              <Text translation='modals.confirm.amountToDeposit' />
            </Row.Label>
            <Row px={0} fontWeight='medium'>
              <Stack direction='row' alignItems='center'>
                <AssetIcon size='xs' src={collateralAsset.icon ?? ''} />
                <RawText>{collateralAsset.name ?? ''}</RawText>
              </Stack>
              <Row.Value>
                <Amount.Crypto
                  value={depositAmountCryptoPrecision}
                  symbol={collateralAsset.symbol ?? ''}
                />
              </Row.Value>
            </Row>
          </Row>
          <Row variant='vert-gutter'>
            <Row.Label>
              <Text translation='common.receive' />
            </Row.Label>
            <Row px={0} fontWeight='medium'>
              <Stack direction='row' alignItems='center'>
                <AssetIcon size='xs' src={borrowAsset.icon ?? ''} />
                <RawText>{borrowAsset.name ?? ''}</RawText>
              </Stack>
              <Row.Value>
                <Amount.Fiat value={activeQuoteData.quoteBorrowedAmountUserCurrency} />
                <Amount.Crypto
                  value={activeQuoteData.quoteBorrowedAmountCryptoPrecision}
                  symbol={borrowAsset.symbol ?? ''}
                />
              </Row.Value>
            </Row>
          </Row>
          <Row variant='gutter'>
            <Row.Label>
              <HelperTooltip label={translate('trade.tooltip.protocolFee')}>
                <Text translation={'trade.protocolFee'} />
              </HelperTooltip>
            </Row.Label>
            <Row.Value>
              <Box textAlign='right'>
                <Amount.Fiat
                  fontWeight='bold'
                  value={activeQuoteData.quoteTotalFeesFiatUserCurrency}
                />
                <Amount.Crypto
                  color='text.subtle'
                  value={activeQuoteData.quoteTotalFeesCryptoPrecision}
                  symbol={collateralAsset.symbol ?? ''}
                />
              </Box>
            </Row.Value>
          </Row>
          <Row variant='gutter'>
            <Button
              as={Link}
              width='full'
              isExternal
              variant='ghost-filled'
              colorScheme='green'
              rightIcon={externalLinkIcon}
              href={`${collateralAsset.explorerTxLink}${txHash}`}
            >
              {translate('defi.viewOnChain')}
            </Button>
          </Row>
        </Summary>
      </TxStatus>
    </SlideTransition>
  )
}
