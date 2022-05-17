import { Box, Button, Collapse, Skeleton, SkeletonText } from '@chakra-ui/react'
import { AssetId } from '@shapeshiftoss/caip'
import { useEffect, useRef, useState } from 'react'
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

const DESCRIPTION_DEFAULT_HEIGHT = 75

export const AssetDescription = ({ assetId }: AssetDescriptionProps) => {
  const translate = useTranslate()
  const [showDescription, setShowDescription] = useState(false)
  const [shouldDisplayToggleButton, setShouldDisplayToggleButton] = useState(true)
  const descriptionEl = useRef<HTMLDivElement | null>(null)
  const handleToggle = () => setShowDescription(!showDescription)
  const asset = useAppSelector(state => selectAssetById(state, assetId))
  const { name, description, isTrustedDescription } = asset || {}
  const query = useGetAssetDescriptionQuery(assetId)
  const isLoaded = !query.isLoading

  // If the height of the description is higher than the collapse element when it's closed
  // we should display the Show More button
  useEffect(() => {
    setShouldDisplayToggleButton(
      (descriptionEl?.current?.clientHeight ?? 0) > DESCRIPTION_DEFAULT_HEIGHT,
    )
  }, [descriptionEl?.current?.clientHeight, description])

  if (!description || !isLoaded) return null

  return (
    <Card>
      <Card.Footer>
        <Skeleton isLoaded={isLoaded} size='md'>
          <Card.Heading mb={4}>
            {translate('assets.assetDetails.assetHeader.aboutAsset', { asset: name })}
          </Card.Heading>
        </Skeleton>
        <Collapse startingHeight={DESCRIPTION_DEFAULT_HEIGHT} in={showDescription}>
          <Box ref={descriptionEl}>
            <SkeletonText isLoaded={isLoaded} noOfLines={4} spacing={2} skeletonHeight='20px'>
              {isTrustedDescription && (
                <ParsedHtml color='gray.500' innerHtml={markdownLinkToHTML(description)} />
              )}
              {!isTrustedDescription && (
                <SanitizedHtml color='gray.500' dirtyHtml={markdownLinkToHTML(description)} />
              )}
            </SkeletonText>
          </Box>
        </Collapse>
        {shouldDisplayToggleButton && (
          <Button size='sm' onClick={handleToggle} mt='1rem'>
            {showDescription
              ? translate('assets.assetDetails.assetDescription.showLess')
              : translate('assets.assetDetails.assetDescription.showMore')}
          </Button>
        )}
      </Card.Footer>
    </Card>
  )
}
