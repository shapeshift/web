import { Card, Stack } from '@chakra-ui/react'
import type { Asset } from '@shapeshiftoss/types'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'
import { FormDivider } from 'components/FormDivider'

type AssetToAssetCardProps = {
  sellAsset: Asset | undefined
  buyAsset: Asset | undefined
  sellAmountCryptoPrecision: string | undefined
  sellAmountUserCurrency: string | undefined
  buyAmountCryptoPrecision: string | undefined
  buyAmountUserCurrency: string | undefined
}
export const AssetToAssetCard = ({
  sellAsset,
  buyAsset,
  sellAmountCryptoPrecision,
  sellAmountUserCurrency,
  buyAmountCryptoPrecision,
  buyAmountUserCurrency,
}: AssetToAssetCardProps) => {
  if (!(sellAsset && buyAsset)) return null
  return (
    <>
      <Card
        display='flex'
        alignItems='stretch'
        justifyContent='space-evenly'
        flexDir='row'
        gap={4}
        py={6}
        px={4}
      >
        <Stack alignItems='center'>
          <AssetIcon size='sm' assetId={sellAsset?.assetId} />
          <Stack textAlign='center' spacing={0}>
            <Amount.Crypto value={sellAmountCryptoPrecision} symbol={sellAsset.symbol} />
            <Amount.Fiat fontSize='sm' color='text.subtle' value={sellAmountUserCurrency} />
          </Stack>
        </Stack>
        <FormDivider my={-6} orientation='vertical' />
        <Stack alignItems='center'>
          <AssetIcon size='sm' assetId={buyAsset?.assetId} />
          <Stack textAlign='center' spacing={0}>
            <Amount.Crypto value={buyAmountCryptoPrecision} symbol={buyAsset.symbol} />
            <Amount.Fiat fontSize='sm' color='text.subtle' value={buyAmountUserCurrency} />
          </Stack>
        </Stack>
      </Card>
    </>
  )
}
