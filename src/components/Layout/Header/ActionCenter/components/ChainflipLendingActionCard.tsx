import { Button, ButtonGroup, HStack, Link, Stack, useDisclosure } from '@chakra-ui/react'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'

import { ActionCard } from './ActionCard'
import { ActionStatusIcon } from './ActionStatusIcon'
import { ActionStatusTag } from './ActionStatusTag'

import { Amount } from '@/components/Amount/Amount'
import { AssetIconWithBadge } from '@/components/AssetIconWithBadge'
import { RawText } from '@/components/Text'
import type { TextPropTypes } from '@/components/Text/Text'
import { Text } from '@/components/Text/Text'
import { middleEllipsis } from '@/lib/utils'
import { formatSmartDate } from '@/lib/utils/time'
import type { ChainflipLendingAction } from '@/state/slices/actionSlice/types'
import { ActionStatus, ChainflipLendingOperationType } from '@/state/slices/actionSlice/types'
import { selectAssetById } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

dayjs.extend(relativeTime)

type ChainflipLendingActionCardProps = {
  action: ChainflipLendingAction
}

export const ChainflipLendingActionCard = ({ action }: ChainflipLendingActionCardProps) => {
  const translate = useTranslate()
  const { chainflipLendingMetadata } = action
  const operationTestIdSuffix = chainflipLendingMetadata.operationType

  const asset = useAppSelector(state => selectAssetById(state, chainflipLendingMetadata.assetId))

  const formattedDate = useMemo(() => {
    return formatSmartDate(action.updatedAt)
  }, [action.updatedAt])

  const { isOpen, onToggle } = useDisclosure({
    defaultIsOpen: action.status === ActionStatus.Pending,
  })

  const translationComponents = useMemo((): TextPropTypes['components'] | undefined => {
    if (!asset) return undefined

    return {
      amountAndSymbol: (
        <Amount.Crypto
          value={chainflipLendingMetadata.amountCryptoPrecision}
          symbol={asset.symbol}
          fontSize='sm'
          fontWeight='bold'
          maximumFractionDigits={6}
          omitDecimalTrailingZeros
          display='inline'
        />
      ),
    }
  }, [asset, chainflipLendingMetadata.amountCryptoPrecision])

  const icon = useMemo(() => {
    return (
      <AssetIconWithBadge assetId={chainflipLendingMetadata.assetId} size='md'>
        <ActionStatusIcon status={action.status} />
      </AssetIconWithBadge>
    )
  }, [chainflipLendingMetadata.assetId, action.status])

  const description = useMemo(() => {
    return (
      <Text
        data-testid={`chainflip-lending-action-description-${operationTestIdSuffix}`}
        fontSize='sm'
        translation={[
          chainflipLendingMetadata.message,
          {
            amount: chainflipLendingMetadata.amountCryptoPrecision,
            symbol: asset?.symbol,
          },
        ]}
        components={translationComponents}
      />
    )
  }, [
    chainflipLendingMetadata.message,
    chainflipLendingMetadata.amountCryptoPrecision,
    asset?.symbol,
    operationTestIdSuffix,
    translationComponents,
  ])

  const footer = useMemo(() => {
    return <ActionStatusTag status={action.status} />
  }, [action.status])

  const operationLabel = useMemo(() => {
    switch (chainflipLendingMetadata.operationType) {
      case ChainflipLendingOperationType.Deposit:
        return translate('chainflipLending.depositToChainflip')
      case ChainflipLendingOperationType.Supply:
        return translate('chainflipLending.supply.title')
      case ChainflipLendingOperationType.Withdraw:
        return translate('common.withdraw')
      case ChainflipLendingOperationType.Egress:
        return translate('chainflipLending.pool.withdrawFromChainflip')
      case ChainflipLendingOperationType.AddCollateral:
        return translate('chainflipLending.collateral.add')
      case ChainflipLendingOperationType.RemoveCollateral:
        return translate('chainflipLending.collateral.remove')
      case ChainflipLendingOperationType.Borrow:
        return translate('chainflipLending.borrow.title')
      case ChainflipLendingOperationType.Repay:
        return translate('chainflipLending.repay.title')
      default:
        return chainflipLendingMetadata.operationType
    }
  }, [chainflipLendingMetadata.operationType, translate])

  const egressTxLink = useMemo(() => {
    if (!chainflipLendingMetadata.egressTxRef || !asset?.explorerTxLink) return undefined
    return `${asset.explorerTxLink}${chainflipLendingMetadata.egressTxRef}`
  }, [chainflipLendingMetadata.egressTxRef, asset?.explorerTxLink])

  const details = useMemo(() => {
    return (
      <Stack gap={4} data-testid={`chainflip-lending-action-details-${operationTestIdSuffix}`}>
        <Stack spacing={3}>
          <HStack
            justifyContent='space-between'
            alignItems='flex-start'
            data-testid={`chainflip-lending-action-operation-${operationTestIdSuffix}`}
          >
            <RawText fontSize='sm' color='text.subtle'>
              {translate('actionCenter.chainflipLending.details.operation')}
            </RawText>
            <RawText fontSize='sm' fontWeight='medium' textAlign='right'>
              {operationLabel}
            </RawText>
          </HStack>
          <HStack
            justifyContent='space-between'
            alignItems='flex-start'
            data-testid={`chainflip-lending-action-amount-${operationTestIdSuffix}`}
          >
            <RawText fontSize='sm' color='text.subtle'>
              {translate('actionCenter.chainflipLending.details.amount')}
            </RawText>
            <Amount.Crypto
              value={chainflipLendingMetadata.amountCryptoPrecision}
              symbol={asset?.symbol ?? ''}
              fontSize='sm'
              fontWeight='medium'
              maximumFractionDigits={6}
              omitDecimalTrailingZeros
            />
          </HStack>
          {chainflipLendingMetadata.txHash && (
            <HStack
              justifyContent='space-between'
              alignItems='flex-start'
              data-testid={`chainflip-lending-action-tx-hash-${operationTestIdSuffix}`}
            >
              <RawText fontSize='sm' color='text.subtle'>
                {translate('actionCenter.chainflipLending.details.transactionId')}
              </RawText>
              <RawText fontSize='sm' fontWeight='medium' textAlign='right'>
                {middleEllipsis(chainflipLendingMetadata.txHash)}
              </RawText>
            </HStack>
          )}
          {chainflipLendingMetadata.egressTxRef && (
            <HStack
              justifyContent='space-between'
              alignItems='flex-start'
              data-testid={`chainflip-lending-action-egress-tx-${operationTestIdSuffix}`}
            >
              <RawText fontSize='sm' color='text.subtle'>
                {translate('actionCenter.chainflipLending.details.egressTransactionId')}
              </RawText>
              <RawText fontSize='sm' fontWeight='medium' textAlign='right'>
                {middleEllipsis(chainflipLendingMetadata.egressTxRef)}
              </RawText>
            </HStack>
          )}
        </Stack>
        {egressTxLink && (
          <ButtonGroup width='full' size='sm'>
            <Button
              width='full'
              as={Link}
              isExternal
              href={egressTxLink}
              data-testid={`chainflip-lending-action-view-tx-${operationTestIdSuffix}`}
            >
              {translate('actionCenter.viewTransaction')}
            </Button>
          </ButtonGroup>
        )}
      </Stack>
    )
  }, [
    asset?.symbol,
    chainflipLendingMetadata.amountCryptoPrecision,
    chainflipLendingMetadata.egressTxRef,
    chainflipLendingMetadata.txHash,
    egressTxLink,
    operationLabel,
    operationTestIdSuffix,
    translate,
  ])

  if (!asset) return null

  return (
    <ActionCard
      type={action.type}
      formattedDate={formattedDate}
      isCollapsable={true}
      isOpen={isOpen}
      onToggle={onToggle}
      footer={footer}
      description={description}
      icon={icon}
    >
      {details}
    </ActionCard>
  )
}
