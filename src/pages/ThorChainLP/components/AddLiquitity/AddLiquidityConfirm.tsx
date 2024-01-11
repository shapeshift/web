import { ArrowBackIcon } from '@chakra-ui/icons'
import { Card, CardBody, CardHeader, Flex, IconButton, Stack } from '@chakra-ui/react'
import { ethAssetId } from '@shapeshiftoss/caip'
import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { usdcAssetId } from 'test/mocks/accounts'
import { Row } from 'components/Row/Row'
import { RawText } from 'components/Text'

import { PoolIcon } from '../PoolIcon'

export const AddLiquidityConfirm = () => {
  const translate = useTranslate()
  const backIcon = useMemo(() => <ArrowBackIcon />, [])
  const assetIds = useMemo(() => [ethAssetId, usdcAssetId], [])
  return (
    <Card width='full' maxWidth='md'>
      <CardHeader display='flex' alignItems='center' gap={2}>
        <IconButton aria-label='back' icon={backIcon} />
        {translate('common.confirm')}
      </CardHeader>
      <CardBody>
        <Stack>
          <Flex gap={2} alignItems='center' justifyContent='center'>
            <PoolIcon size='sm' assetIds={assetIds} />
            <RawText fontWeight='medium'>ETH/USDC</RawText>
          </Flex>
          <Row>
            <Row.Label>{translate('pools.assetDepositAmount')}</Row.Label>
          </Row>
        </Stack>
      </CardBody>
    </Card>
  )
}
