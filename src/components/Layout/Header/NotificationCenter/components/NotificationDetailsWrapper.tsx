import { Card, CardBody } from '@chakra-ui/react'
import type { PropsWithChildren } from 'react'

type NotificationDetailsWrapperProps = PropsWithChildren

export const NotificationDetailsWrapper = ({ children }: NotificationDetailsWrapperProps) => {
  return (
    <Card bg='transparent' mt={4}>
      <CardBody px={0} py={0}>
        {children}
      </CardBody>
    </Card>
  )
}
