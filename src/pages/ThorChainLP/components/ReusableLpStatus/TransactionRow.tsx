import { Button, Card, CardBody, CardHeader, Center, Collapse, Flex, Link } from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { FaCheck } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'
import { CircularProgress } from 'components/CircularProgress/CircularProgress'
import { Row } from 'components/Row/Row'
import { selectAssetById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

type TransactionRowProps = {
  assetId?: AssetId
  amountCryptoPrecision: string
  onComplete: () => void
  isActive?: boolean
  isLast?: boolean
}

export const TransactionRow: React.FC<TransactionRowProps> = ({
  assetId,
  amountCryptoPrecision,
  onComplete,
  isActive,
}) => {
  const translate = useTranslate()
  const asset = useAppSelector(state => selectAssetById(state, assetId ?? ''))
  const [status, setStatus] = useState(TxStatus.Unknown)
  const [txId, setTxId] = useState<string | null>(null)

  const handleSignTx = useCallback(() => {
    setStatus(TxStatus.Pending)
    setTxId('200')
  }, [])

  useEffect(() => {
    let isMounted = true

    if (status === TxStatus.Pending) {
      setTimeout(() => {
        if (isMounted) {
          setStatus(TxStatus.Confirmed)
          onComplete()
        }
      }, 1000)
    }

    return () => {
      isMounted = false
    }
  }, [onComplete, status])

  const txIdLink = useMemo(() => `${asset?.explorerTxLink}/${txId}`, [asset?.explorerTxLink, txId])

  if (!asset) return null

  return (
    <Card>
      <CardHeader gap={2} display='flex' flexDir='row' alignItems='center'>
        <AssetIcon size='xs' assetId={asset.assetId} />
        <Amount.Crypto fontWeight='bold' value={amountCryptoPrecision} symbol={asset.symbol} />{' '}
        <Flex ml='auto' alignItems='center' gap={2}>
          {txId && (
            <Button as={Link} isExternal href={txIdLink} size='xs'>
              {translate('common.seeDetails')}
            </Button>
          )}
          {status === TxStatus.Confirmed ? (
            <>
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
            <CircularProgress isIndeterminate={status === TxStatus.Pending} size='24px' />
          )}
        </Flex>
      </CardHeader>
      <Collapse in={isActive}>
        <CardBody display='flex' flexDir='column' gap={2}>
          <Row fontSize='sm'>
            <Row.Label>{translate('common.gasFee')}</Row.Label>
            <Row.Value>
              <Amount.Crypto value='0.02' symbol={asset.symbol} />
            </Row.Value>
          </Row>
          <Button
            mx={-2}
            size='lg'
            colorScheme='blue'
            onClick={handleSignTx}
            isLoading={status === TxStatus.Pending}
          >
            {translate('common.signTransaction')}
          </Button>
        </CardBody>
      </Collapse>
    </Card>
  )
}
