import { Button } from '@chakra-ui/button'
import { Box, Link, Stack } from '@chakra-ui/layout'
import { ModalBody, ModalFooter } from '@chakra-ui/modal'
import { CircularProgressLabel } from '@chakra-ui/progress'
import { Alert, AlertDescription, useColorModeValue } from '@chakra-ui/react'
import { Asset } from '@shapeshiftoss/types'
import { FaGasPump } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'
import { CircularProgress } from 'components/CircularProgress/CircularProgress'
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
  preFooter?: React.ReactNode
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
  preFooter,
  onCancel,
  onConfirm
}: ApproveProps) => {
  const translate = useTranslate()
  return (
    <SlideTransition>
      <ModalBody width='full' textAlign='center'>
        <CircularProgress size='120px' thickness='4px' mt={8} mb={4} isIndeterminate={loading}>
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
          {preFooter}
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
