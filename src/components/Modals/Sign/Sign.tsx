import {
  Alert,
  AlertDescription,
  AlertIcon,
  Badge,
  Box,
  Button,
  Collapse,
  Image,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Textarea,
} from '@chakra-ui/react'
import cryptoTools from 'crypto'
import { ipcRenderer } from 'electron'
import React, { useCallback, useEffect, useState } from 'react'
import KeepKey from 'assets/hold-and-release.svg'
import { Text } from 'components/Text'
import { useModal } from 'hooks/useModal/useModal'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { getAssetUrl } from 'lib/getAssetUrl'
import { logger } from 'lib/logger'

import { MiddleEllipsis } from '../../MiddleEllipsis/MiddleEllipsis'
import { Row } from '../../Row/Row'

export const SignModal = (input: any) => {
  const [error] = useState<string | null>(null)
  const [loading] = useState(false)
  const [show, setShow] = React.useState(false)
  const [isApproved, setIsApproved] = React.useState(false)
  const { sign } = useModal()
  const { close, isOpen } = sign

  const HDwalletPayload = input?.unsignedTx?.invocation?.unsignedTx?.HDwalletPayload

  const [nonce, setNonce] = useState('')
  const [gasPrice, setGasPrice] = useState('')
  const [gasLimit, setGasLimit] = useState('')

  const [holdAndRelease, setHoldAndRelease] = useState(KeepKey)

  const moduleLogger = logger.child({
    namespace: ['Sign'],
  })

  useEffect(() => {
    getAssetUrl(KeepKey).then(setHoldAndRelease)
  }, [])

  useEffect(() => {
    if (!HDwalletPayload || !HDwalletPayload.nonce) return
    if (HDwalletPayload.nonce) setNonce(HDwalletPayload.nonce)
    if (HDwalletPayload.gasLimit) setGasLimit(HDwalletPayload.gasLimit)
    if (HDwalletPayload.gasPrice) setGasPrice(HDwalletPayload.gasPrice)
  }, [HDwalletPayload])

  let isSwap: boolean = false
  if (input?.unsignedTx?.invocation?.unsignedTx?.type === 'swap') isSwap = true

  const HandleReject = async () => {
    setIsApproved(false)
    ipcRenderer.send(`@account/tx-rejected-${input.nonce}`, { nonce: input.nonce })
    //show sign
    ipcRenderer.send('unlockWindow', {})
    //onCloseModal
    ipcRenderer.send('@modal/sign-close', {})
    close()
  }

  const handleToggle = () => setShow(!show)

  const signTx = useCallback(
    async (unsignedTx: any, wallet: any) => {
      try {
        if (!wallet) throw Error('Can not not sign if a HDWwallet is not paired!')
        if (!unsignedTx) throw Error('Invalid payload! empty')
        if (!unsignedTx.HDwalletPayload) throw Error('Invalid payload! missing: HDwalletPayload')

        //TODO validate payload
        //TODO validate fee's
        //TODO load EV data

        let signedTx
        let broadcastString
        let buffer
        let txid
        switch (unsignedTx.network) {
          case 'RUNE':
            signedTx = await wallet.thorchainSignTx(unsignedTx.HDwalletPayload)

            broadcastString = {
              tx: signedTx,
              type: 'cosmos-sdk/StdTx',
              mode: 'sync',
            }
            buffer = Buffer.from(JSON.stringify(broadcastString), 'base64')
            //TODO FIXME
            txid = cryptoTools.createHash('sha256').update(buffer).digest('hex').toUpperCase()

            signedTx.serialized = JSON.stringify(broadcastString)
            signedTx.txid = txid
            break
          case 'ATOM':
            signedTx = await wallet.cosmosSignTx(unsignedTx.HDwalletPayload)
            txid = cryptoTools
              .createHash('sha256')
              .update(signedTx.serialized)
              .digest('hex')
              .toUpperCase()
            signedTx.txid = txid
            break
          case 'OSMO':
            signedTx = await wallet.osmosisSignTx(unsignedTx.HDwalletPayload)
            buffer = Buffer.from(JSON.stringify(signedTx.serialized), 'base64')
            //TODO FIXME
            txid = cryptoTools.createHash('sha256').update(buffer).digest('hex').toUpperCase()
            signedTx.txid = txid
            break
          case 'ETH':
            signedTx = await wallet.ethSignTx(unsignedTx.HDwalletPayload)
            //TODO do txid hashing in HDwallet
            //txid = keccak256(signedTx.serialized).toString('hex')
            txid = 'broke'
            signedTx.txid = txid
            break
          case 'BTC':
          case 'BCH':
          case 'LTC':
          case 'DOGE':
          case 'DASH':
          case 'DGB':
          case 'RDD':
            signedTx = await wallet.btcSignTx(unsignedTx.HDwalletPayload)
            break
          default:
            throw Error('network not supported! ' + unsignedTx.network)
        }

        return signedTx
      } catch (e) {
        moduleLogger.error(e, 'sign error')
      }
    },
    [moduleLogger],
  )

  const HandleSubmit = useCallback(async () => {
    setIsApproved(true)
    //show sign
    const unsignedTx = {
      ...input?.unsignedTx.invocation.unsignedTx,
      HDwalletPayload: {
        ...input?.unsignedTx.invocation?.unsignedTx?.HDwalletPayload,
        nonce,
        gasLimit,
        gasPrice,
      },
    }

    let signedTx = await signTx(unsignedTx, {} as any)
    ipcRenderer.send(`@account/tx-signed-${input.nonce}`, { signedTx, nonce: input.nonce })
    ipcRenderer.send('@modal/sign-close', {})
    setIsApproved(false)
    close()
  }, [input, nonce, gasLimit, gasPrice, signTx, close])

  // @ts-ignore
  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        ipcRenderer.send('unlockWindow', {})
        ipcRenderer.send('@modal/close', {})
        setIsApproved(false)
        close()
      }}
      isCentered
      closeOnOverlayClick={false}
      closeOnEsc={false}
    >
      <ModalOverlay />
      <ModalContent justifyContent='center' px={3} pt={3} pb={6}>
        <ModalCloseButton ml='auto' borderRadius='full' position='static' />
        <ModalHeader>
          <Text translation={'modals.sign.header'} />
        </ModalHeader>
        <ModalBody>
          {isApproved ? (
            <div>
              <Image src={holdAndRelease} alt='Approve Transaction On Device!' />
            </div>
          ) : (
            <div>
              <Row>
                <Row.Label>
                  <Text translation={'modals.sign.network'} />
                </Row.Label>
                <Row.Value>{input?.unsignedTx?.invocation?.unsignedTx?.network}</Row.Value>
              </Row>
              <Row>
                <Row.Label>
                  <Text translation={'modals.sign.summary'} />
                </Row.Label>
                <Row.Value>{input?.unsignedTx?.invocation?.unsignedTx?.verbal}</Row.Value>
              </Row>
              <Box w='100%' p={4} color='white'>
                <div>
                  {/*<Text translation={'modals.sign.extendedValidation'}/>: <Badge>FAIL</Badge>*/}
                </div>
              </Box>

              <Row>
                <Row.Label>
                  <Text translation={'modals.sign.from'} />
                </Row.Label>
                <Row.Value>
                  <MiddleEllipsis
                    rounded='lg'
                    fontSize='sm'
                    p='1'
                    pl='2'
                    pr='2'
                    bgColor='gray.800'
                    value={input?.unsignedTx?.invocation?.unsignedTx?.transaction?.addressFrom}
                  />
                </Row.Value>
              </Row>

              {isSwap ? (
                <div>
                  <Row>
                    <Row.Label>
                      <Text translation={'modals.sign.protocol'} />
                    </Row.Label>
                    <Row.Value>
                      {input?.unsignedTx?.invocation?.unsignedTx?.transaction?.protocol}
                    </Row.Value>
                  </Row>
                  <Row>
                    <Row.Label>
                      <Text translation={'modals.sign.router'} />
                    </Row.Label>
                    <Row.Value>
                      {input?.unsignedTx?.invocation?.unsignedTx?.transaction?.router}
                      <Badge>VALID</Badge>
                    </Row.Value>
                  </Row>
                  <Row>
                    <Row.Label>
                      <Text translation={'modals.sign.memo'} />
                    </Row.Label>
                    <Row.Value>
                      <small>{input?.unsignedTx?.invocation?.unsignedTx?.transaction?.memo}</small>
                    </Row.Value>
                  </Row>
                </div>
              ) : (
                <div></div>
              )}

              {isSwap ? (
                <div></div>
              ) : (
                <div>
                  <Row>
                    <Row.Label>
                      <Text translation={'modals.sign.to'} />
                    </Row.Label>
                    <Row.Value>
                      <MiddleEllipsis
                        rounded='lg'
                        fontSize='sm'
                        p='1'
                        pl='2'
                        pr='2'
                        bgColor='gray.800'
                        value={input?.unsignedTx?.invocation?.unsignedTx?.transaction?.recipient}
                      />
                    </Row.Value>
                  </Row>
                </div>
              )}

              <Row>
                <Row.Label>
                  <Text translation={'modals.sign.amount'} />
                </Row.Label>
                <Row.Value>
                  <small>
                    {bnOrZero(input?.unsignedTx?.invocation?.unsignedTx?.transaction?.amount)
                      .shiftedBy(-18)
                      .toString()}{' '}
                    ({input?.unsignedTx?.invocation?.unsignedTx?.transaction?.asset})
                  </small>
                </Row.Value>
              </Row>

              {nonce && (
                <Row>
                  <Row.Label>
                    <Text translation={'modals.sign.nonce'} />
                  </Row.Label>
                  <Input
                    size='xs'
                    width='25%'
                    textAlign='right'
                    value={parseInt(nonce, 16)}
                    onChange={e => {
                      if (!e.target.value) setNonce((0).toString(16))
                      setNonce(`0x${Number(e.target.value).toString(16)}`)
                    }}
                  />
                </Row>
              )}

              {gasPrice && (
                <Row>
                  <Row.Label>
                    <Text translation={'modals.sign.gasPrice'} />
                  </Row.Label>
                  <Input
                    size='xs'
                    width='25%'
                    textAlign='right'
                    value={parseInt(gasPrice, 16)}
                    onChange={e => {
                      if (!e.target.value) setGasPrice((0).toString(16))
                      setGasPrice(`0x${Number(e.target.value).toString(16)}`)
                    }}
                  />
                </Row>
              )}

              {gasLimit && (
                <Row>
                  <Row.Label>
                    <Text translation={'modals.sign.gasLimit'} />
                  </Row.Label>
                  <Input
                    size='xs'
                    width='25%'
                    textAlign='right'
                    value={parseInt(gasLimit, 16)}
                    onChange={e => {
                      if (!e.target.value) setGasLimit((0).toString(16))
                      setGasLimit(`0x${Number(e.target.value).toString(16)}`)
                    }}
                  />
                </Row>
              )}

              {/*<Row>*/}
              {/*  <Row.Label>*/}
              {/*    <Text translation={'modals.sign.fee'} />*/}
              {/*  </Row.Label>*/}
              {/*  <Row.Value isTruncated>*/}
              {/*    <small>{input?.invocation?.unsignedTx?.transaction?.fee}</small>*/}
              {/*  </Row.Value>*/}
              {/*</Row>*/}

              <Collapse in={show}>
                <div>
                  HDwalletPayload:
                  <Textarea
                    value={JSON.stringify(HDwalletPayload, undefined, 4)}
                    size='md'
                    resize='vertical'
                  />
                </div>
              </Collapse>
              <Row>
                <Button size='sm' onClick={handleToggle} mt='1rem'>
                  {show ? 'hide' : 'Show Advanced Tx info'}
                </Button>
              </Row>
              <br />
              <Row>
                {error && (
                  <Alert status='error'>
                    <AlertIcon />
                    <AlertDescription>
                      <Text translation={error} />
                    </AlertDescription>
                  </Alert>
                )}
                <Button size='lg' colorScheme='blue' onClick={HandleSubmit} disabled={loading}>
                  <Text translation={'modals.sign.sign'} />
                </Button>
              </Row>
              <br />
              <Row>
                <Button size='sm' colorScheme='red' onClick={HandleReject}>
                  <Text translation={'modals.sign.reject'} />
                </Button>
              </Row>
            </div>
          )}
        </ModalBody>
      </ModalContent>
    </Modal>
  )
}
