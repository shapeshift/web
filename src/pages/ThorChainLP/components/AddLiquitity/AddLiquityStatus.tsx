import {
  Button,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  Center,
  Collapse,
  Flex,
  Heading,
  HStack,
  Stack,
} from '@chakra-ui/react'
import { thorchainAssetId } from '@shapeshiftoss/caip'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import { useCallback, useMemo, useState } from 'react'
import { FaCheck } from 'react-icons/fa6'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'
import { CircularProgress } from 'components/CircularProgress/CircularProgress'
import { usdcAssetId } from 'components/Modals/FiatRamps/config'
import { Row } from 'components/Row/Row'
import { SlideTransition } from 'components/SlideTransition'
import { RawText } from 'components/Text'

import { AddLiquidityRoutePaths } from './types'

export const AddLiquidityStatus = () => {
  const translate = useTranslate()
  const history = useHistory()
  const [firstTx, setFirstTx] = useState(TxStatus.Unknown)
  const [secondTx, setSecondTx] = useState(TxStatus.Pending)
  const [isComplete, setIsComplete] = useState(false)

  const handleGoBack = useCallback(() => {
    history.push(AddLiquidityRoutePaths.Input)
  }, [history])

  const handleComplete = useCallback(() => {
    setSecondTx(TxStatus.Confirmed)
    setIsComplete(true)
  }, [])

  const handleNext = useCallback(() => {
    setFirstTx(TxStatus.Confirmed)
    setSecondTx(TxStatus.Unknown)
  }, [])

  const hStackDivider = useMemo(
    () => <RawText mx={1}>{translate('common.and')}</RawText>,
    [translate],
  )

  const renderBody = useMemo(() => {
    if (isComplete) {
      return (
        <CardBody display='flex' flexDir='column' alignItems='center' justifyContent='center'>
          <Center
            bg='background.success'
            boxSize='80px'
            borderRadius='full'
            color='text.success'
            fontSize='xl'
            my={8}
          >
            <FaCheck />
          </Center>
          <Heading as='h4'>{translate('pools.transactionSubmitted')}</Heading>
        </CardBody>
      )
    }
    return (
      <CardBody textAlign='center'>
        <Center my={8}>
          <CircularProgress
            size='100px'
            thickness={4}
            isIndeterminate
            trackColor='background.surface.raised.base'
          />
        </Center>
        <Heading as='h4'>{translate('pools.waitingForConfirmation')}</Heading>
        <Flex gap={1} justifyContent='center' fontWeight='medium'>
          <RawText>{translate('pools.supplying')}</RawText>
          <HStack divider={hStackDivider}>
            <Amount.Crypto value='100' symbol='USDC' />
            <Amount.Crypto value='100' symbol='RUNE' />
          </HStack>
        </Flex>
      </CardBody>
    )
  }, [hStackDivider, isComplete, translate])

  return (
    <SlideTransition>
      {renderBody}
      <CardFooter flexDir='column' px={4}>
        <Stack mt={4}>
          <Card>
            <CardHeader gap={2} display='flex' flexDir='row' alignItems='center'>
              <AssetIcon size='xs' assetId={thorchainAssetId} />
              <Amount.Crypto fontWeight='bold' value='100' symbol='RUNE' />
              <Flex ml='auto' alignItems='center' gap={2}>
                {firstTx === TxStatus.Confirmed ? (
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
            <Collapse in={firstTx === TxStatus.Unknown}>
              <CardBody display='flex' flexDir='column' gap={2}>
                <Row fontSize='sm'>
                  <Row.Label>{translate('common.gasFee')}</Row.Label>
                  <Row.Value>
                    <Amount.Crypto value='0.02' symbol='ETH' />
                  </Row.Value>
                </Row>
                <Button mx={-2} size='lg' colorScheme='blue' onClick={handleNext}>
                  {translate('common.signTransaction')}
                </Button>
              </CardBody>
            </Collapse>
          </Card>
          <Card>
            <CardHeader gap={2} display='flex' flexDir='row' alignItems='center'>
              <AssetIcon size='xs' assetId={usdcAssetId} />
              <Amount.Crypto fontWeight='bold' value='100' symbol='USDC' />
              <Flex ml='auto' alignItems='center' gap={2}>
                {secondTx === TxStatus.Confirmed ? (
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
            <Collapse in={secondTx === TxStatus.Unknown}>
              <CardBody display='flex' flexDir='column' gap={2}>
                <Row fontSize='sm'>
                  <Row.Label>{translate('common.gasFee')}</Row.Label>
                  <Row.Value>
                    <Amount.Crypto value='0.02' symbol='RUNE' />
                  </Row.Value>
                </Row>
                <Button mx={-2} size='lg' colorScheme='blue' onClick={handleComplete}>
                  {translate('common.signTransaction')}
                </Button>
              </CardBody>
            </Collapse>
          </Card>
        </Stack>
      </CardFooter>
      {isComplete && (
        <CardFooter flexDir='column'>
          <Button size='lg' mx={-2} onClick={handleGoBack}>
            {translate('common.goBack')}
          </Button>
        </CardFooter>
      )}
    </SlideTransition>
  )
}
