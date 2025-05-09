import { Button, HStack, Stack } from '@chakra-ui/react'
import { tcyAssetId } from '@shapeshiftoss/caip'
import { fromBaseUnit } from '@shapeshiftoss/utils'
import { useCallback } from 'react'
import { useTranslate } from 'react-polyglot'

import type { Claim } from '../types'

import { Amount } from '@/components/Amount/Amount'
import { AssetIcon } from '@/components/AssetIcon'
import { RawText } from '@/components/Text'
import { THOR_PRECISION } from '@/lib/utils/thorchain/constants'
import { selectAssetById } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

type AssetClaimButtonProps = {
  onClick?: (claim: Claim) => void
  claim: Claim
}

export const AssetClaimButton: React.FC<AssetClaimButtonProps> = ({ onClick, claim }) => {
  const translate = useTranslate()

  const asset = useAppSelector(state => selectAssetById(state, claim.assetId))
  const tcyAsset = useAppSelector(state => selectAssetById(state, tcyAssetId))

  const handleClick = useCallback(() => {
    onClick?.(claim)
  }, [onClick, claim])

  if (!tcyAsset || !asset) return

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
          <RawText fontWeight='bold' color='text.base' fontSize='lg' lineHeight={1}>
            {asset.name}
          </RawText>
          <RawText fontSize='sm' color='text.subtle' lineHeight={1}>
            {asset.symbol}
          </RawText>
        </Stack>
      </HStack>
      <Stack alignItems='flex-end'>
        <Amount.Crypto
          color='text.base'
          fontSize='lg'
          lineHeight={1}
          value={fromBaseUnit(claim.amountThorBaseUnit, THOR_PRECISION)}
          symbol={tcyAsset.symbol}
        />
        <RawText fontSize='sm' color={'green.500'} lineHeight={1}>
          {translate('common.claim')}
        </RawText>
      </Stack>
    </Button>
  )
}
