import { Button } from '@chakra-ui/button'
import { Box, Link, Stack } from '@chakra-ui/layout'
import { ModalBody, ModalFooter } from '@chakra-ui/modal'
import { CircularProgress, CircularProgressLabel } from '@chakra-ui/progress'
import { Asset } from '@shapeshiftoss/types'
import { useTranslate } from 'react-polyglot'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'
import { Row } from 'components/Row/Row'
import { SlideTransition } from 'components/SlideTransition'
import { Text } from 'components/Text'

type ApproveProps = {
  asset: Asset
  feeAsset: Asset
  cryptoEstimatedGasFee: string
  disableAction?: boolean
  fiatEstimatedGasFee: string
  learnMoreLink?: string
  loading: boolean
  loadingText?: string
  onConfirm(): Promise<void>
  onCancel(): void
}

export const Approve = ({
  asset,
  cryptoEstimatedGasFee,
  feeAsset,
  fiatEstimatedGasFee,
  learnMoreLink,
  loading,
  loadingText,
  onCancel,
  onConfirm
}: ApproveProps) => {
  const translate = useTranslate()
  return (
    <SlideTransition>
      <ModalBody width='full' textAlign='center'>
        <CircularProgress
          size='120px'
          thickness='4px'
          trackColor='gray.700'
          color='blue.500'
          mt={8}
          mb={4}
          isIndeterminate={loading}
        >
          <CircularProgressLabel>
            <AssetIcon symbol='usdc' boxSize='90px' />
          </CircularProgressLabel>
        </CircularProgress>
        <Text fontWeight='bold' translation={['modals.approve.header', { asset: asset.name }]} />
        <Text
          color='gray.500'
          mb={6}
          translation={['modals.approve.body', { asset: asset.name }]}
        />
        <Link color='blue.500' href={learnMoreLink} isExternal>
          {translate('modals.approve.learnMore')}
        </Link>
      </ModalBody>
      <ModalFooter flexDir='column' mt={8}>
        <Stack width='full'>
          <Row pb={2}>
            <Row.Label>{translate('modals.approve.estimatedGas')}</Row.Label>
            <Row.Value>
              <Box textAlign='right'>
                <Amount.Fiat value={fiatEstimatedGasFee} />
                <Amount.Crypto
                  color='gray.500'
                  value={cryptoEstimatedGasFee}
                  symbol={feeAsset.symbol}
                />
              </Box>
            </Row.Value>
          </Row>
          <Button
            onClick={onConfirm}
            width='full'
            size='lg'
            colorScheme='blue'
            isLoading={loading}
            loadingText={loadingText}
          >
            {translate('modals.approve.confirm')}
          </Button>
          <Button onClick={onCancel} width='full' size='lg' variant='ghost'>
            {translate('modals.approve.reject')}
          </Button>
        </Stack>
      </ModalFooter>
    </SlideTransition>
  )
}
