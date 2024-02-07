import { ArrowBackIcon } from '@chakra-ui/icons'
import { CardBody, CardHeader, Flex, IconButton } from '@chakra-ui/react'
import { fromAssetId } from '@shapeshiftoss/caip'
import React, { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { SlideTransition } from 'components/SlideTransition'
import { Sweep } from 'components/Sweep'
import type { LpConfirmedDepositQuote } from 'lib/utils/thorchain/lp/types'
import { usePools } from 'pages/ThorChainLP/queries/hooks/usePools'
import { selectAssetById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

type AddLiquiditySweepProps = {
  confirmedQuote: LpConfirmedDepositQuote
  onBack: () => void
  onSweepSeen: () => void
}

const backIcon = <ArrowBackIcon />

export const AddLiquiditySweep: React.FC<AddLiquiditySweepProps> = ({
  confirmedQuote,
  onBack: handleBack,
  onSweepSeen: handleSweepSeen,
}) => {
  const translate = useTranslate()

  const { opportunityId, accountIdsByChainId } = confirmedQuote

  const { data: parsedPools } = usePools()
  const foundPool = useMemo(() => {
    if (!parsedPools) return undefined
    return parsedPools.find(pool => pool.opportunityId === opportunityId)
  }, [opportunityId, parsedPools])

  const asset = useAppSelector(state => selectAssetById(state, foundPool?.assetId ?? ''))
  const assetId = asset?.assetId
  const accountId = accountIdsByChainId[assetId ? fromAssetId(assetId).chainId : '']

  if (!assetId || !accountId || !confirmedQuote.assetAddress) return null

  return (
    <SlideTransition>
      <CardHeader display='flex' alignItems='center' gap={2}>
        <Flex flex={1}>
          <IconButton onClick={handleBack} variant='ghost' aria-label='back' icon={backIcon} />
        </Flex>
        <Flex textAlign='center'>{translate('common.confirm')}</Flex>
        <Flex flex={1}></Flex>
      </CardHeader>
      <CardBody pt={0}>
        <Sweep
          assetId={assetId}
          fromAddress={confirmedQuote.assetAddress}
          accountId={accountId}
          onBack={handleBack}
          onSweepSeen={handleSweepSeen}
        />
      </CardBody>
    </SlideTransition>
  )
}
