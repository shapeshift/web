import { Card, CardBody, CardHeader, Heading, Skeleton } from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import { useTranslate } from 'react-polyglot'

import { AssetDescriptionTeaser } from '@/components/AssetDescriptionTeaser'
import { useGetAssetDescriptionQuery } from '@/state/slices/assetsSlice/assetsSlice'
import { preferences } from '@/state/slices/preferencesSlice/preferencesSlice'
import { selectAssetById } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

type AssetDescriptionProps = {
  assetId: AssetId
}

export const AssetDescription = ({ assetId }: AssetDescriptionProps) => {
  const translate = useTranslate()
  const asset = useAppSelector(state => selectAssetById(state, assetId))
  const { name, description, isTrustedDescription } = asset || {}
  const selectedLocale = useAppSelector(preferences.selectors.selectSelectedLocale)
  const query = useGetAssetDescriptionQuery({ assetId, selectedLocale })
  const isLoaded = !query.isLoading

  if (!description || !isLoaded) return null

  return (
    <Card variant='dashboard'>
      <CardHeader>
        <Skeleton isLoaded={isLoaded} size='md'>
          <Heading as='h5'>
            {translate('assets.assetDetails.assetHeader.aboutAsset', { asset: name })}
          </Heading>
        </Skeleton>
      </CardHeader>
      <CardBody>
        <AssetDescriptionTeaser
          description={description}
          isLoaded={isLoaded}
          isTrustedDescription={isTrustedDescription}
        />
      </CardBody>
    </Card>
  )
}
