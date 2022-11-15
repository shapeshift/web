import { Stack } from '@chakra-ui/react'
import type { AccountId } from '@shapeshiftoss/caip'
import type { KnownChainIds } from '@shapeshiftoss/types'
import isEqual from 'lodash/isEqual'
import { useMemo } from 'react'
import { useFormContext } from 'react-hook-form'
import { useHistory } from 'react-router-dom'
import { AssetAccountRow } from 'components/AssetAccounts/AssetAccountRow'
import { Card } from 'components/Card/Card'
import { SlideTransition } from 'components/SlideTransition'
import { Text } from 'components/Text'
import type { TradeState } from 'components/Trade/types'
import { TradeRoutePaths } from 'components/Trade/types'
import { WithBackButton } from 'components/Trade/WithBackButton'
import { selectAccountIdsByAssetId, selectAssetById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

export const SelectAccount = () => {
  const history = useHistory()
  const { getValues, setValue } = useFormContext<TradeState<KnownChainIds>>()
  const assetId = getValues('sellTradeAsset')?.asset?.assetId
  const filter = useMemo(() => ({ assetId: assetId ?? '' }), [assetId])
  const accountIds = useAppSelector(state => selectAccountIdsByAssetId(state, filter), isEqual)
  const asset = useAppSelector(state => selectAssetById(state, assetId ?? ''))

  const handleBack = () => {
    history.push(TradeRoutePaths.Input)
  }

  const handleClick = (accountId: AccountId) => {
    setValue('selectedSellAssetAccountId', accountId)
    history.push(TradeRoutePaths.Input)
  }

  return (
    <SlideTransition>
      <Card variant='unstyled'>
        <Card.Header px={0} pt={0}>
          <WithBackButton handleBack={handleBack}>
            <Card.Heading textAlign='center'>
              <Text translation='accounts.selectAccount' />
            </Card.Heading>
          </WithBackButton>
        </Card.Header>
        <Card.Body p={0} height='400px' display='flex' flexDir='column'>
          <Stack>
            {accountIds.map(accountId => (
              <AssetAccountRow
                accountId={accountId}
                assetId={asset.assetId}
                key={accountId}
                isCompact
                onClick={() => handleClick(accountId)}
              />
            ))}
          </Stack>
        </Card.Body>
      </Card>
    </SlideTransition>
  )
}
