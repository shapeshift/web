import type { StackDirection } from '@chakra-ui/react'
import { Stack } from '@chakra-ui/react'
import { foxOnArbitrumOneAssetId } from '@shapeshiftoss/caip'
import { useMemo } from 'react'
import { Main } from 'components/Layout/Main'
import { selectAssetById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { Faq } from './components/Faq/Faq'
import { Overview } from './components/Overview/Overview'
import { RFOXHeader } from './components/RFOXHeader'
import { TxHistory } from './components/TxHistory/TxHistory'
import { RFOXProvider } from './hooks/useRfoxContext'
import { Widget } from './Widget'

const direction: StackDirection = { base: 'column-reverse', xl: 'row' }
const maxWidth = { base: '100%', md: '450px' }
const mainPaddingBottom = { base: 16, md: 8 }

const stakingAssetId = foxOnArbitrumOneAssetId

export const RFOX: React.FC = () => {
  const rFOXHeader = useMemo(() => <RFOXHeader />, [])

  const stakingAsset = useAppSelector(state => selectAssetById(state, stakingAssetId))

  if (!stakingAsset) return null

  return (
    <RFOXProvider stakingAssetId={stakingAssetId}>
      <Main pb={mainPaddingBottom} headerComponent={rFOXHeader} px={4} isSubPage>
        <Stack alignItems='flex-start' spacing={4} mx='auto' direction={direction}>
          <Stack spacing={4} flex='1 1 0%' width='full'>
            <Overview />
            <TxHistory />
            <Faq />
          </Stack>
          <Stack flex={1} width='full' maxWidth={maxWidth} spacing={4}>
            <Widget />
          </Stack>
        </Stack>
      </Main>
    </RFOXProvider>
  )
}
