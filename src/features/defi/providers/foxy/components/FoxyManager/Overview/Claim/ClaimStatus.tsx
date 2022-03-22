import { Box, Button, Center, ModalBody, ModalFooter, Stack } from '@chakra-ui/react'
import { CAIP19 } from '@shapeshiftoss/caip'
import { useTranslate } from 'react-polyglot'
import { useLocation } from 'react-router'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'
import { CircularProgress } from 'components/CircularProgress/CircularProgress'
import { Row } from 'components/Row/Row'
import { SlideTransition } from 'components/SlideTransition'
import { RawText } from 'components/Text'
import { useBrowserRouter } from 'context/BrowserRouterProvider/BrowserRouterProvider'
import { selectAssetByCAIP19 } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

interface ClaimStatusState {
  txid: string
  asset: CAIP19
  amount: string
}

export const ClaimStatus = () => {
  const { history: browserHistory } = useBrowserRouter()
  const translate = useTranslate()
  const { state: routeState } = useLocation<ClaimStatusState>()
  const asset = useAppSelector(state => selectAssetByCAIP19(state, routeState.asset))
  return (
    <SlideTransition>
      <ModalBody>
        <Center py={8} flexDirection='column'>
          <CircularProgress size='24' position='relative' thickness='4px'>
            <Box position='absolute' top='50%' left='50%' transform='translate(-50%, -50%)'>
              <AssetIcon src={asset.icon} boxSize='16' />
            </Box>
          </CircularProgress>
          <RawText mt={6} fontWeight='medium'>
            Broadcasting Transaction...
          </RawText>
        </Center>
      </ModalBody>
      <ModalFooter>
        <Stack width='full' spacing={4}>
          <Row>
            <Row.Label>{translate('defi.modals.claim.claimAmount')}</Row.Label>
            <Row.Value>
              <Amount.Crypto value={routeState.amount} symbol={asset.symbol} />
            </Row.Value>
          </Row>
          <Row>
            <Row.Label>{translate('defi.modals.claim.claimToAddress')}</Row.Label>
            <Row.Value>0x444...4444</Row.Value>
          </Row>
          <Row>
            <Row.Label>{translate('modals.status.transactionId')}</Row.Label>
            <Row.Value>0x444.4444</Row.Value>
          </Row>
          <Button isFullWidth size='lg' onClick={() => browserHistory.goBack()}>
            {translate('common.close')}
          </Button>
        </Stack>
      </ModalFooter>
    </SlideTransition>
  )
}
