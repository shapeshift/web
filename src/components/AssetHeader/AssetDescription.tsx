import { Button, Collapse, Skeleton, SkeletonText } from '@chakra-ui/react'
import { CAIP19 } from '@shapeshiftoss/caip'
import { useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { Card } from 'components/Card/Card'
import { SanitizedHtml } from 'components/SanitizedHtml/SanitizedHtml'
import { useGetAssetDescriptionQuery } from 'state/slices/assetsSlice/assetsSlice'
import { selectAssetByCAIP19 } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

type AssetDescriptionProps = {
  assetId: CAIP19
}

export const AssetDescription = ({ assetId }: AssetDescriptionProps) => {
  const translate = useTranslate()
  const [showDescription, setShowDescription] = useState(false)
  const handleToggle = () => setShowDescription(!showDescription)
  const asset = useAppSelector(state => selectAssetByCAIP19(state, assetId))
  const { name, description } = asset || {}
  const query = useGetAssetDescriptionQuery(assetId)
  const isLoaded = !query.isLoading
  if (!description || !isLoaded) return null
  return (
    <Card>
      <Card.Footer>
        <Skeleton isLoaded={isLoaded} size='md'>
          <Card.Heading mb={4}>
            {translate('assets.assetDetails.assetHeader.aboutAsset', { asset: name })}
          </Card.Heading>
        </Skeleton>
        <Collapse startingHeight={70} in={showDescription}>
          <SkeletonText isLoaded={isLoaded} noOfLines={4} spacing={2} skeletonHeight='20px'>
            <SanitizedHtml color='gray.500' dirtyHtml={description} />
          </SkeletonText>
        </Collapse>
        <Button size='sm' onClick={handleToggle} mt='1rem'>
          {showDescription
            ? translate('assets.assetDetails.assetDescription.showLess')
            : translate('assets.assetDetails.assetDescription.showMore')}
        </Button>
      </Card.Footer>
    </Card>
  )
}
