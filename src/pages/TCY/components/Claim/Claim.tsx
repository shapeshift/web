import { Card, CardHeader, Heading } from '@chakra-ui/react'
import { useTranslate } from 'react-polyglot'

import type { CurrentAccount } from '../../tcy'
import type { TCYRouteProps } from '../../types'
import { ClaimSelect } from './ClaimSelect'

type ClaimProps = TCYRouteProps & {
  currentAccount: CurrentAccount
}

export const Claim: React.FC<ClaimProps> = ({ headerComponent, currentAccount }) => {
  const translate = useTranslate()
  return (
    <Card>
      <CardHeader>
        <Heading size='sm'>{translate('common.claim')}</Heading>
      </CardHeader>
      <ClaimSelect headerComponent={headerComponent} currentAccount={currentAccount} />
    </Card>
  )
}
