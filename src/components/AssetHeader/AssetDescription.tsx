import { Button, Collapse, Skeleton, SkeletonText } from '@chakra-ui/react'
import { AssetId } from '@shapeshiftoss/caip'
import { useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { Card } from 'components/Card/Card'
import { ParsedHtml } from 'components/ParsedHtml/ParsedHtml'
import { SanitizedHtml } from 'components/SanitizedHtml/SanitizedHtml'
import { markdownLinkToHTML } from 'lib/utils'
import { useGetAssetDescriptionQuery } from 'state/slices/assetsSlice/assetsSlice'
import { selectAssetById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

type AssetDescriptionProps = {
  assetId: AssetId
}

export const AssetDescription = ({ assetId }: AssetDescriptionProps) => {
  const translate = useTranslate()
  const [showDescription, setShowDescription] = useState(false)
  const handleToggle = () => setShowDescription(!showDescription)
  const asset = useAppSelector(state => selectAssetById(state, assetId))
  const { name, description, isTrustedDescription } = asset || {}
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
            {isTrustedDescription && (
              <ParsedHtml color='gray.500' innerHtml={markdownLinkToHTML(description)} />
            )}
            {!isTrustedDescription && (
              <SanitizedHtml color='gray.500' dirtyHtml={markdownLinkToHTML(description)} />
            )}
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
