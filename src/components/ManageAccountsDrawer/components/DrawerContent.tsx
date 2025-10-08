import { DrawerBody, DrawerFooter, DrawerHeader, Flex } from '@chakra-ui/react'

import { RawText } from '@/components/Text'

export type DrawerContentWrapperProps = {
  title?: string
  description?: string
  body?: React.ReactNode
  footer: React.ReactNode
  headerLeftContent?: React.ReactNode
}

export const DrawerContentWrapper = ({
  title,
  description,
  body,
  footer,
  headerLeftContent,
}: DrawerContentWrapperProps) => {
  return (
    <>
      <DrawerHeader pt='calc(env(safe-area-inset-top) + var(--safe-area-inset-top) + 1rem)'>
        <Flex alignItems='center'>
          {headerLeftContent}
          <Flex direction='column' flex={1}>
            {title && <RawText as='h3'>{title}</RawText>}
            {description && (
              <RawText color='text.subtle' fontSize='md'>
                {description}
              </RawText>
            )}
          </Flex>
        </Flex>
      </DrawerHeader>
      {body && <DrawerBody>{body}</DrawerBody>}
      <DrawerFooter pb='calc(env(safe-area-inset-bottom) + 1rem + var(--safe-area-inset-bottom))'>
        {footer}
      </DrawerFooter>
    </>
  )
}
