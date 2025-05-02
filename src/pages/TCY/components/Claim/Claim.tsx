import { Card, CardHeader, Heading } from '@chakra-ui/react'
import { useTranslate } from 'react-polyglot'

import type { TCYRouteProps } from '../../types'
import { ClaimSelect } from './ClaimSelect'

interface ClaimProps extends TCYRouteProps {
  activeAccountNumber: number
}

export const Claim: React.FC<ClaimProps> = ({ headerComponent, activeAccountNumber }) => {
  const translate = useTranslate()
  return (
    <Card>
      <CardHeader>
        <Heading size='sm'>{translate('common.claim')}</Heading>
      </CardHeader>
      <ClaimSelect headerComponent={headerComponent} activeAccountNumber={activeAccountNumber} />
    </Card>
  )
}
