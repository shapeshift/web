import { ArrowBackIcon } from '@chakra-ui/icons'
import { CardBody, CardHeader, Flex, IconButton } from '@chakra-ui/react'
import { useTranslate } from 'react-polyglot'

import type { Claim } from './types'

import { SlideTransition } from '@/components/SlideTransition'
import { Sweep } from '@/components/Sweep'

type ClaimSweepProps = {
  claim: Claim
  onBack: () => void
  onSweepSeen: () => void
}

const backIcon = <ArrowBackIcon />

export const ClaimSweep: React.FC<ClaimSweepProps> = ({
  claim,
  onBack: handleBack,
  onSweepSeen: handleSweepSeen,
}) => {
  const translate = useTranslate()

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
          assetId={claim.assetId}
          fromAddress={claim.l1_address ?? null}
          accountId={claim.accountId}
          onBack={handleBack}
          onSweepSeen={handleSweepSeen}
        />
      </CardBody>
    </SlideTransition>
  )
}
