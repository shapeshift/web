import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Center,
  CircularProgress,
  Collapse,
  Flex,
} from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import { FaCheck } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'
import { Row } from 'components/Row/Row'
import { selectAssetById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

type TransactionRowProps = {
  assetId?: AssetId
  amountCryptoPrecision: string
  handleSignTx: () => void
  status: TxStatus
}

export const TransactionRow: React.FC<TransactionRowProps> = ({
  assetId,
  amountCryptoPrecision,
  handleSignTx,
  status,
}) => {
  const translate = useTranslate()
  const asset = useAppSelector(state => selectAssetById(state, assetId ?? ''))

  if (!asset) return null

  return (
    <Card>
      <CardHeader gap={2} display='flex' flexDir='row' alignItems='center'>
        <AssetIcon size='xs' assetId={asset.assetId} />
        <Amount.Crypto fontWeight='bold' value={amountCryptoPrecision} symbol={asset.symbol} />{' '}
        <Flex ml='auto' alignItems='center' gap={2}>
          {status === TxStatus.Confirmed ? (
            <>
              <Button size='xs'>{translate('common.seeDetails')}</Button>
              <Center
                bg='background.success'
                boxSize='24px'
                borderRadius='full'
                color='text.success'
                fontSize='xs'
              >
                <FaCheck />
              </Center>
            </>
          ) : (
            <CircularProgress size='24px' />
          )}
        </Flex>
      </CardHeader>
      <Collapse in={status === TxStatus.Unknown}>
        <CardBody display='flex' flexDir='column' gap={2}>
          <Row fontSize='sm'>
            <Row.Label>{translate('common.gasFee')}</Row.Label>
            <Row.Value>
              <Amount.Crypto value='0.02' symbol={asset.symbol} />
            </Row.Value>
          </Row>
          <Button mx={-2} size='lg' colorScheme='blue' onClick={handleSignTx}>
            {translate('common.signTransaction')}
          </Button>
        </CardBody>
      </Collapse>
    </Card>
  )
}
