import { Stack } from '@chakra-ui/react'
import type { AccountId } from '@shapeshiftoss/caip'
import isEqual from 'lodash/isEqual'
import { useMemo } from 'react'
import { useHistory } from 'react-router-dom'
import { AssetAccountRow } from 'components/AssetAccounts/AssetAccountRow'
import { Card } from 'components/Card/Card'
import { SlideTransition } from 'components/SlideTransition'
import { Text } from 'components/Text'
import { useSwapperState } from 'components/Trade/SwapperProvider/swapperProvider'
import { SwapperActionType } from 'components/Trade/SwapperProvider/types'
import { TradeRoutePaths } from 'components/Trade/types'
import { WithBackButton } from 'components/Trade/WithBackButton'
import { selectAccountIdsByAssetId, selectAssetById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

export const SelectAccount = () => {
  const history = useHistory()
  const { sellTradeAsset } = useSwapperState()
  const assetId = sellTradeAsset?.asset?.assetId
  const filter = useMemo(() => ({ assetId: assetId ?? '' }), [assetId])
  const accountIds = useAppSelector(state => selectAccountIdsByAssetId(state, filter), isEqual)
  const asset = useAppSelector(state => selectAssetById(state, assetId ?? ''))
  const { dispatch: swapperDispatch } = useSwapperState()

  if (!asset) throw new Error(`Asset not found for AssetId ${assetId}`)

  const handleBack = () => {
    history.push(TradeRoutePaths.Input)
  }

  const handleClick = (accountId: AccountId) => {
    swapperDispatch({
      type: SwapperActionType.SET_VALUES,
      payload: {
        selectedSellAssetAccountId: accountId,
      },
    })
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
