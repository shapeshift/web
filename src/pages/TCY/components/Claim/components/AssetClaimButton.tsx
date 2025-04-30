import { Button, HStack, Stack } from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'

import { Amount } from '@/components/Amount/Amount'
import { AssetIcon } from '@/components/AssetIcon'
import { RawText } from '@/components/Text'

type AssetClaimButtonProps = {
  onClick?: () => void
  isDisabled?: boolean
  assetId: AssetId
  assetName: string
  assetSymbol: string
  assetAmount: string
  claimAction: string
}

export const AssetClaimButton: React.FC<AssetClaimButtonProps> = ({
  onClick,
  isDisabled,
  assetId,
  assetName,
  assetSymbol,
  assetAmount,
  claimAction,
}) => {
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
        <AssetIcon assetId={assetId} />
        <Stack alignItems='flex-start'>
          <RawText fontWeight='bold' color='text.base' fontSize='lg'>
            {assetName}
          </RawText>
          <RawText fontSize='sm' color='text.subtle'>
            {assetSymbol}
          </RawText>
        </Stack>
      </HStack>
      <Stack alignItems='flex-end'>
        <Amount.Crypto color='text.base' fontSize='lg' value={assetAmount} symbol={assetSymbol} />
        <RawText fontSize='sm' color={isDisabled ? 'text.subtle' : 'green.500'}>
          {claimAction}
        </RawText>
      </Stack>
    </Button>
  )
}
