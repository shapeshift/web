import { Button, HStack, Stack } from '@chakra-ui/react'
import { useCallback } from 'react'
import { useTranslate } from 'react-polyglot'

import type { Claim } from '../types'

import { Amount } from '@/components/Amount/Amount'
import { AssetIcon } from '@/components/AssetIcon'
import { RawText } from '@/components/Text'
import { selectAssetById } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

type AssetClaimButtonProps = {
  onClick?: (claim: Claim) => void
  claim: Claim
}

export const AssetClaimButton: React.FC<AssetClaimButtonProps> = ({ onClick, claim }) => {
  const translate = useTranslate()

  const asset = useAppSelector(state => selectAssetById(state, claim.assetId))
  if (!asset) return

  const handleClick = useCallback(() => {
    onClick?.(claim)
  }, [onClick])

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
      onClick={handleClick}
    >
      <HStack gap={4}>
        <AssetIcon assetId={claim.assetId} />
        <Stack alignItems='flex-start'>
          <RawText fontWeight='bold' color='text.base' fontSize='lg'>
            {asset.name}
          </RawText>
          <RawText fontSize='sm' color='text.subtle'>
            {asset.symbol}
          </RawText>
        </Stack>
      </HStack>
      <Stack alignItems='flex-end'>
        <Amount.Crypto
          color='text.base'
          fontSize='lg'
          value={claim.amountThorBaseUnit}
          symbol={asset.symbol}
        />
        <RawText fontSize='sm' color={'green.500'}>
          {translate('common.claim')}
        </RawText>
      </Stack>
    </Button>
  )
}
