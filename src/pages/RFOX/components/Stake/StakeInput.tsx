import { Button, CardFooter, Collapse, Stack } from '@chakra-ui/react'
import { foxAssetId } from '@shapeshiftoss/caip'
import { useCallback, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router'
import { Amount } from 'components/Amount/Amount'
import { TradeAssetSelect } from 'components/AssetSelection/AssetSelection'
import { FormDivider } from 'components/FormDivider'
import { TradeAssetInput } from 'components/MultiHopTrade/components/TradeAssetInput'
import { Row } from 'components/Row/Row'
import { SlideTransition } from 'components/SlideTransition'
import { WarningAcknowledgement } from 'components/WarningAcknowledgement/WarningAcknowledgement'
import { selectAssetById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { AddressSelection } from '../AddressSelection'
import { StakeSummary } from './components/StakeSummary'
import { StakeRoutePaths, type StakeRouteProps } from './types'

const formControlProps = {
  borderRadius: 0,
  background: 'transparent',
  borderWidth: 0,
  paddingBottom: 0,
  paddingTop: 0,
}

export const StakeInput: React.FC<StakeRouteProps> = ({ headerComponent }) => {
  const translate = useTranslate()
  const history = useHistory()
  const asset = useAppSelector(state => selectAssetById(state, foxAssetId))
  const [showWarning, setShowWarning] = useState(false)
  const percentOptions = useMemo(() => [1], [])
  const [cryptoAmount, setCryptoAmount] = useState('')
  const [fiatAmount, setFiatAmount] = useState('')

  const handleAccountIdChange = useCallback(() => {}, [])

  const hasEnterValue = useMemo(() => !!fiatAmount || !!cryptoAmount, [cryptoAmount, fiatAmount])

  const handleChange = useCallback((value: string, isFiat?: boolean) => {
    if (isFiat) {
      setFiatAmount(value)
    } else {
      setCryptoAmount(value)
    }
  }, [])

  const handleWarning = useCallback(() => {
    setShowWarning(true)
  }, [])

  const handleSubmit = useCallback(() => {
    history.push(StakeRoutePaths.Confirm)
  }, [history])

  const assetSelectComponent = useMemo(() => {
    return <TradeAssetSelect assetId={asset?.assetId} isReadOnly onlyConnectedChains={true} />
  }, [asset?.assetId])

  if (!asset) return null

  return (
    <SlideTransition>
      <WarningAcknowledgement
        message={translate(['RFOX.stakeWarning', { cooldownPeriod: '28-days' }])}
        onAcknowledge={handleSubmit}
        shouldShowWarningAcknowledgement={showWarning}
        setShouldShowWarningAcknowledgement={setShowWarning}
      >
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
            label={translate('transactionRow.amount')}
            labelPostFix={assetSelectComponent}
            isSendMaxDisabled={false}
            onChange={handleChange}
            cryptoAmount={cryptoAmount}
            fiatAmount={fiatAmount}
          />
          <FormDivider />
          <AddressSelection />
          <Collapse in={hasEnterValue}>
            <StakeSummary assetId={asset.assetId} />
            <CardFooter
              borderTopWidth={1}
              borderColor='border.subtle'
              flexDir='column'
              gap={4}
              px={6}
              py={4}
              bg='background.surface.raised.accent'
            >
              <Row fontSize='sm' fontWeight='medium'>
                <Row.Label>{translate('common.gasFee')}</Row.Label>
                <Row.Value>
                  <Amount.Fiat value='10' />
                </Row.Value>
              </Row>
              <Row fontSize='sm' fontWeight='medium'>
                <Row.Label>{translate('common.fees')}</Row.Label>
                <Row.Value>
                  <Amount.Fiat value='0.0' />
                </Row.Value>
              </Row>
            </CardFooter>
          </Collapse>
        </Stack>
        <CardFooter
          borderTopWidth={1}
          borderColor='border.subtle'
          flexDir='column'
          gap={4}
          px={6}
          bg='background.surface.raised.accent'
          borderBottomRadius='xl'
        >
          <Button
            size='lg'
            mx={-2}
            onClick={handleWarning}
            colorScheme='blue'
            isDisabled={!hasEnterValue}
          >
            {translate('RFOX.stake')}
          </Button>
        </CardFooter>
      </WarningAcknowledgement>
    </SlideTransition>
  )
}
