import { Card, CardHeader, Heading } from '@chakra-ui/react'
import { useTranslate } from 'react-polyglot'

import type { TCYRouteProps } from '../../types'
import { ClaimSelect } from './ClaimSelect'

export const Claim: React.FC<TCYRouteProps> = () => {
  const translate = useTranslate()
  return (
    <Card>
      <CardHeader>
        <Heading size='sm'>{translate('TCY.claim')}</Heading>
      </CardHeader>
      <ClaimSelect />
    </Card>
  )
}
