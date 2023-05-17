import { CheckIcon, CloseIcon, ExternalLinkIcon } from '@chakra-ui/icons'
import { Button, Link, Stack } from '@chakra-ui/react'
import { toAssetId } from '@shapeshiftoss/caip'
import { Summary } from 'features/defi/components/Summary'
import { TxStatus } from 'features/defi/components/TxStatus/TxStatus'
import type {
  DefiParams,
  DefiQueryParams,
} from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { useCallback, useContext, useEffect, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router-dom'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'
import { StatusTextEnum } from 'components/RouteSteps/RouteSteps'
import { Row } from 'components/Row/Row'
import { RawText, Text } from 'components/Text'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { trackOpportunityEvent } from 'lib/mixpanel/helpers'
import { MixPanelEvents } from 'lib/mixpanel/types'
import { toValidatorId } from 'state/slices/opportunitiesSlice/utils'
import {
  selectAssetById,
  selectAssets,
  selectMarketDataById,
  selectStakingOpportunityByFilter,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { DepositContext } from '../DepositContext'

export const Status = () => {
  const translate = useTranslate()
  const { state } = useContext(DepositContext)
  const history = useHistory()
  const { query, history: browserHistory } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const { chainId, assetReference, contractAddress } = query
  const assets = useAppSelector(selectAssets)
  const assetNamespace = 'slip44'
  const assetId = toAssetId({ chainId, assetNamespace, assetReference })

  const asset = useAppSelector(state => selectAssetById(state, assetId))
  const assetMarketData = useAppSelector(state => selectMarketDataById(state, assetId))
  if (!asset) throw new Error(`Asset not found for AssetId ${assetId}`)

  const validatorId = toValidatorId({ chainId, account: contractAddress })

  const opportunityMetadataFilter = useMemo(() => ({ validatorId }), [validatorId])

  const opportunityMetadata = useAppSelector(state =>
    selectStakingOpportunityByFilter(state, opportunityMetadataFilter),
  )

  const cryptoAmount = useMemo(
    () => bnOrZero(state?.deposit.cryptoAmount).toString(),
    [state?.deposit.cryptoAmount],
  )
  const fiatAmount = useMemo(
    () => bnOrZero(cryptoAmount).times(assetMarketData.price).toString(),
    [assetMarketData.price, cryptoAmount],
  )

  const handleViewPosition = useCallback(() => {
    browserHistory.push('/earn')
  }, [browserHistory])

  const handleCancel = history.goBack

  useEffect(() => {
    if (!opportunityMetadata) return
    if (state?.deposit.txStatus === 'success') {
      trackOpportunityEvent(
        MixPanelEvents.DepositSuccess,
        {
          opportunity: opportunityMetadata,
          fiatAmounts: [fiatAmount],
          cryptoAmounts: [{ assetId, amountCryptoHuman: cryptoAmount }],
        },
        assets,
      )
    }
  }, [assetId, assets, cryptoAmount, fiatAmount, opportunityMetadata, state?.deposit.txStatus])

  if (!state) return null

  const { statusIcon, statusText, statusBg, statusBody } = (() => {
    switch (state.deposit.txStatus) {
      case 'success':
        return {
          statusText: StatusTextEnum.success,
          statusIcon: <CheckIcon color='white' />,
          statusBody: translate('modals.stake.status.success', {
            opportunity: asset.name,
          }),
          statusBg: 'green.500',
        }
      case 'failed':
        return {
          statusText: StatusTextEnum.failed,
          statusIcon: <CloseIcon color='white' />,
          statusBody: translate('modals.stake.status.failed'),
          statusBg: 'red.500',
        }
      default:
        return {
          statusIcon: <AssetIcon size='xs' src={asset?.icon} />,
          statusText: StatusTextEnum.pending,
          statusBody: translate('modals.stake.status.pending'),
          statusBg: 'transparent',
        }
    }
  })()

  return (
    <TxStatus
      onClose={handleCancel}
      onContinue={state.deposit.txStatus === 'success' ? handleViewPosition : undefined}
      loading={!['success', 'failed'].includes(state.deposit.txStatus)}
      statusText={statusText}
      statusIcon={statusIcon}
      statusBg={statusBg}
      statusBody={statusBody}
      continueText='modals.status.position'
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
              <Amount.Crypto value={cryptoAmount} symbol={asset.symbol} />
            </Row.Value>
          </Row>
        </Row>
        {state.deposit.txStatus === 'success' && (
          <Row variant='gutter'>
            <Button
              as={Link}
              width='full'
              isExternal
              variant='ghost-filled'
              colorScheme='green'
              rightIcon={<ExternalLinkIcon />}
              href={`${asset.explorerTxLink}/${state.txid}`}
            >
              {translate('defi.viewOnChain')}
            </Button>
          </Row>
        )}
      </Summary>
    </TxStatus>
  )
}
