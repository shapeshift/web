import { Button, HStack, Stack } from '@chakra-ui/react'
import { ethAssetId } from '@shapeshiftoss/caip'

import { Amount } from '@/components/Amount/Amount'
import { AssetIcon } from '@/components/AssetIcon'
import { RawText } from '@/components/Text'

type AssetClaimButtonProps = {
  onClick?: () => void
  isDisabled?: boolean
}

export const AssetClaimButton: React.FC<AssetClaimButtonProps> = ({ onClick, isDisabled }) => {
  return (
    <Button
      height='auto'
      py={4}
      px={4}
      minHeight='auto'
      variant='ghost'
      size='sm'
      width='full'
      alignItems='center'
      justifyContent='space-between'
      gap={4}
      onClick={onClick}
      isDisabled={isDisabled}
    >
      <HStack gap={4}>
        <AssetIcon assetId={ethAssetId} />
        <Stack alignItems='flex-start'>
          <RawText fontWeight='bold' color='text.base' fontSize='lg'>
            Bitcoin
          </RawText>
          <RawText fontSize='sm' color='text.subtle'>
            BTC
          </RawText>
        </Stack>
      </HStack>
      <Stack alignItems='flex-end'>
        <Amount.Crypto color='text.base' fontSize='lg' value='100' symbol='TCY' />
        <RawText fontSize='sm' color='green.500'>
          Claim
        </RawText>
      </Stack>
    </Button>
  )
}
