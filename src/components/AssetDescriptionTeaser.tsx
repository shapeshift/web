import { Box, Button, Collapse, SkeletonText } from '@chakra-ui/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslate } from 'react-polyglot'

import { ParsedHtml } from './ParsedHtml/ParsedHtml'
import { SanitizedHtml } from './SanitizedHtml/SanitizedHtml'

import { markdownLinkToHTML } from '@/lib/utils'

const DESCRIPTION_DEFAULT_HEIGHT = 75

export type AssetDescriptionTeaserProps = {
  description?: string
  isLoaded?: boolean
  isTrustedDescription?: boolean
}

export const AssetDescriptionTeaser: React.FC<AssetDescriptionTeaserProps> = ({
  description,
  isLoaded,
  isTrustedDescription,
}) => {
  const translate = useTranslate()
  const [showDescription, setShowDescription] = useState(false)
  const [shouldDisplayToggleButton, setShouldDisplayToggleButton] = useState(true)
  const descriptionEl = useRef<HTMLDivElement | null>(null)
  const handleToggle = useCallback(() => setShowDescription(!showDescription), [showDescription])

  // Collapse about section any time description changes
  useEffect(() => {
    setShowDescription(false)
  }, [description])

  // If the height of the description is higher than the collapse element when it's closed
  // we should display the Show More button
  useEffect(() => {
    setShouldDisplayToggleButton(
      (descriptionEl?.current?.clientHeight ?? 0) > DESCRIPTION_DEFAULT_HEIGHT,
    )
  }, [descriptionEl?.current?.clientHeight, description])

  if (!description && isLoaded) return null

  return (
    <Box>
      <Collapse startingHeight={DESCRIPTION_DEFAULT_HEIGHT} in={showDescription}>
        <Box ref={descriptionEl}>
          <SkeletonText isLoaded={isLoaded} noOfLines={4} spacing={2} skeletonHeight='20px'>
            {description && isTrustedDescription && (
              <ParsedHtml color='text.subtle' innerHtml={markdownLinkToHTML(description)} />
            )}
            {description && !isTrustedDescription && (
              <SanitizedHtml color='text.subtle' dirtyHtml={markdownLinkToHTML(description)} />
            )}
          </SkeletonText>
        </Box>
      </Collapse>
      {description && shouldDisplayToggleButton && (
        <Button size='sm' onClick={handleToggle} mt={1}>
          {showDescription
            ? translate('assets.assetDetails.assetDescription.showLess')
            : translate('assets.assetDetails.assetDescription.showMore')}
        </Button>
      )}
    </Box>
  )
}
