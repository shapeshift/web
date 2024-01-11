import { ArrowBackIcon } from '@chakra-ui/icons'
import { Card, CardHeader, FormLabel, IconButton, Stack, StackDivider } from '@chakra-ui/react'
import { ethAssetId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { useCallback, useMemo } from 'react'
import { useHistory } from 'react-router'
import { usdcAssetId } from 'components/Modals/FiatRamps/config'
import { TradeAssetSelect } from 'components/MultiHopTrade/components/AssetSelection'
import { SlippagePopover } from 'components/MultiHopTrade/components/SlippagePopover'

import { DepositType } from './components/DepositType'

const buttonProps = { flex: 1, justifyContent: 'space-between' }

export const AddLiquidity = () => {
  const history = useHistory()
  const divider = useMemo(() => <StackDivider borderColor='border.base' />, [])

  const handleAssetChange = useCallback((asset: Asset) => {
    console.info(asset)
  }, [])

  const handleBackClick = useCallback(() => {
    history.push('/pools')
  }, [history])

  const backIcon = useMemo(() => <ArrowBackIcon />, [])

  return (
    <Card width='100%' maxWidth='md'>
      <CardHeader display='flex' alignItems='center' justifyContent='space-between'>
        <IconButton
          onClick={handleBackClick}
          variant='ghost'
          icon={backIcon}
          aria-label='go back'
        />
        Add Liquidity
        <SlippagePopover />
      </CardHeader>
      <Stack divider={divider} spacing={4}>
        <Stack>
          <FormLabel px={6} mb={0}>
            Select pair
          </FormLabel>
          <TradeAssetSelect
            assetId={ethAssetId}
            onAssetChange={handleAssetChange}
            isLoading={false}
            mb={0}
            buttonProps={buttonProps}
          />
          <TradeAssetSelect
            assetId={usdcAssetId}
            onAssetChange={handleAssetChange}
            isLoading={false}
            mb={0}
            buttonProps={buttonProps}
          />
        </Stack>
        <Stack>
          <FormLabel mb={0} px={6}>
            Deposit amounts
          </FormLabel>
          <DepositType />
        </Stack>
      </Stack>
    </Card>
  )
}
