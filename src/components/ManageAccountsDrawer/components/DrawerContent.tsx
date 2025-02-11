import { DrawerBody, DrawerFooter, DrawerHeader } from '@chakra-ui/react'
import { RawText } from 'components/Text'

export type DrawerContentWrapperProps = {
  title?: string
  description?: string
  body?: React.ReactNode
  footer: React.ReactNode
}

export const DrawerContentWrapper = ({
  title,
  description,
  body,
  footer,
}: DrawerContentWrapperProps) => {
  return (
    <>
      <DrawerHeader pt='calc(env(safe-area-inset-top) + 1rem)'>
        {title && <RawText as='h3'>{title}</RawText>}
        {description && (
          <RawText color='text.subtle' fontSize='md'>
            {description}
          </RawText>
        )}
      </DrawerHeader>
      {body && <DrawerBody>{body}</DrawerBody>}
      <DrawerFooter pb='calc(env(safe-area-inset-bottom) + 1rem)'>{footer}</DrawerFooter>
    </>
  )
}
