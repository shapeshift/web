import { Center, Stack } from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import type { TxMetadata } from '@shapeshiftoss/chain-adapters'

import { ApprovalAmount } from './ApprovalAmount'

import { BadgeCheckIcon } from '@/components/Icons/BadgeCheck'

type ApprovalDetailsProps = {
  assetId: AssetId
  value: string
  parser: TxMetadata['parser']
}

export const ApprovalDetails = ({ assetId, value, parser }: ApprovalDetailsProps) => {
  return (
    <Stack
      width='full'
      p={4}
      spacing={4}
      justifyContent='center'
      alignItems='center'
      borderWidth={1}
      borderColor='border.base'
      bg='background.surface.raised.base'
      borderRadius='2xl'
      boxShadow='sm'
    >
      <Center bg='blue.500' boxSize={10} borderRadius='full' fontSize='2xl'>
        <BadgeCheckIcon />
      </Center>
      <ApprovalAmount assetId={assetId} value={value} parser={parser} variant='tag' />
    </Stack>
  )
}
