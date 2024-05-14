import { Stack } from '@chakra-ui/react'
import { foxAssetId } from '@shapeshiftoss/caip'
import { useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { TradeAssetSelect } from 'components/AssetSelection/AssetSelection'
import { TradeAssetInput } from 'components/MultiHopTrade/components/TradeAssetInput'
import { SlideTransition } from 'components/SlideTransition'
import { selectAssetById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import type { StakeRouteProps } from './types'

const formControlProps = {
  borderRadius: 0,
  background: 'transparent',
  borderWidth: 0,
  paddingBottom: 0,
  paddingTop: 0,
}

export const StakeInput: React.FC<StakeRouteProps> = ({ headerComponent }) => {
  const translate = useTranslate()
  const asset = useAppSelector(state => selectAssetById(state, foxAssetId))
  const percentOptions = useMemo(() => [1], [])
  const handleAssetClick = useCallback(() => {
    console.info('asset clicked')
  }, [])

  const handleAssetChange = useCallback(() => {
    console.info('asset changed')
  }, [])

  const handleAccountIdChange = useCallback(() => {}, [])

  const assetSelectComponent = useMemo(() => {
    return (
      <TradeAssetSelect
        assetId={asset?.assetId}
        onAssetChange={handleAssetChange}
        onAssetClick={handleAssetClick}
      />
    )
  }, [asset?.assetId, handleAssetChange, handleAssetClick])
  return (
    <SlideTransition>
      <Stack>
        {headerComponent}
        <TradeAssetInput
          assetId={asset?.assetId}
          assetSymbol={asset?.symbol ?? ''}
          assetIcon={asset?.icon ?? ''}
          percentOptions={percentOptions}
          onAccountIdChange={handleAccountIdChange}
          formControlProps={formControlProps}
          layout='inline'
          label={translate('common.amount')}
          labelPostFix={assetSelectComponent}
          isSendMaxDisabled={false}
        />
      </Stack>
    </SlideTransition>
  )
}
