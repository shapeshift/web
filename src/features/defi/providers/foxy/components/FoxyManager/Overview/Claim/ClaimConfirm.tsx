import { Button, ModalBody, ModalFooter, Stack } from '@chakra-ui/react'
import { CAIP19 } from '@shapeshiftoss/caip'
import { bnOrZero } from '@shapeshiftoss/chain-adapters'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'
import { Row } from 'components/Row/Row'
import { SlideTransition } from 'components/SlideTransition'
import { Text } from 'components/Text'
import { selectAssetByCAIP19 } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

type ClaimConfirmProps = {
  caip19: CAIP19
  amount?: string
  onBack: () => void
}

export const ClaimConfirm = ({ caip19, amount, onBack }: ClaimConfirmProps) => {
  const asset = useAppSelector(state => selectAssetByCAIP19(state, caip19))
  const translate = useTranslate()
  const claimAmount = bnOrZero(amount).toString()
  const history = useHistory()
  const handleConfirm = () => {
    history.push('/status', {
      txid: '1234',
      asset: caip19,
      amount
    })
  }
  return (
    <SlideTransition>
      <ModalBody>
        <Stack alignItems='center' justifyContent='center' py={8}>
          <Text color='gray.500' translation='defi.modals.claim.claimAmount' />
          <Stack direction='row' alignItems='center' justifyContent='center'>
            <AssetIcon boxSize='10' src={asset.icon} />
            <Amount.Crypto
              fontSize='3xl'
              fontWeight='medium'
              value={claimAmount}
              symbol={asset?.symbol}
            />
          </Stack>
        </Stack>
      </ModalBody>
      <ModalFooter flexDir='column'>
        <Stack width='full' spacing={6}>
          <Row>
            <Row.Label>
              <Text translation='defi.modals.claim.claimToAddress' />
            </Row.Label>
            <Row.Value>0x222..88fb</Row.Value>
          </Row>
          <Row>
            <Row.Label>
              <Text translation='common.estimatedGas' />
            </Row.Label>
            <Row.Value>
              <Stack textAlign='right' spacing={0}>
                <Amount.Fiat value='22' />
                <Amount.Crypto color='gray.500' value='0.2' symbol='ETH' />
              </Stack>
            </Row.Value>
          </Row>
          <Stack direction='row' width='full' justifyContent='space-between'>
            <Button size='lg' onClick={onBack}>
              {translate('common.cancel')}
            </Button>
            <Button size='lg' colorScheme='blue' onClick={handleConfirm}>
              {translate('defi.modals.claim.confirmClaim')}
            </Button>
          </Stack>
        </Stack>
      </ModalFooter>
    </SlideTransition>
  )
}
