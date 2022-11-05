import { Skeleton } from '@chakra-ui/react'
import type { AssetId } from '@keepkey/caip'
import { useTranslate } from 'react-polyglot'
import { AssetDescriptionTeaser } from 'components/AssetDescriptionTeaser'
import { Card } from 'components/Card/Card'
import { useGetAssetDescriptionQuery } from 'state/slices/assetsSlice/assetsSlice'
import { selectAssetById, selectSelectedLocale } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

type AssetDescriptionProps = {
  assetId: AssetId
}

export const AssetDescription = ({ assetId }: AssetDescriptionProps) => {
  const translate = useTranslate()
  const asset = useAppSelector(state => selectAssetById(state, assetId))
  const { name, description, isTrustedDescription } = asset || {}
  const selectedLocale = useAppSelector(selectSelectedLocale)
  const query = useGetAssetDescriptionQuery({ assetId, selectedLocale })
  const isLoaded = !query.isLoading

  if (!description || !isLoaded) return null

  return (
    <Card>
      <Card.Body>
        <Skeleton isLoaded={isLoaded} size='md'>
          <Card.Heading mb={4}>
            {translate('assets.assetDetails.assetHeader.aboutAsset', { asset: name })}
          </Card.Heading>
        </Skeleton>
        <AssetDescriptionTeaser
          description={description}
          isLoaded={isLoaded}
          isTrustedDescription={isTrustedDescription}
        />
      </Card.Body>
    </Card>
  )
}
