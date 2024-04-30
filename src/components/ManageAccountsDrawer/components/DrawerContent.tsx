import { DrawerBody, DrawerFooter, DrawerHeader } from '@chakra-ui/react'
import { RawText } from 'components/Text'

export type DrawerContentWrapperProps = {
  title: string
  description: string
  body: React.ReactNode
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
      <DrawerHeader>
        <RawText as='h3'>{title}</RawText>
        <RawText color='text.subtle' fontSize='md'>
          {description}
        </RawText>
      </DrawerHeader>
      <DrawerBody>{body}</DrawerBody>
      <DrawerFooter>{footer}</DrawerFooter>
    </>
  )
}
