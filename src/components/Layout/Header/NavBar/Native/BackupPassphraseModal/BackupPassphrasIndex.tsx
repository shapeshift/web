import { ModalCloseButton } from '@chakra-ui/modal'
import {
  Alert,
  AlertDescription,
  AlertIcon,
  Button,
  Code,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Tag,
  Wrap,
} from '@chakra-ui/react'
import { Vault } from '@shapeshiftoss/hdwallet-native-vault'
import range from 'lodash/range'
import { ReactNode, useMemo, useState } from 'react'
import { FaEye } from 'react-icons/fa'
import { useHistory } from 'react-router'
import { Text } from 'components/Text'

import { BackupPassphraseRoutes } from './BackupPassphraseCommon'
// import { useWallet } from 'hooks/useWallet/useWallet'
// import { logger } from 'lib/logger'

// const moduleLogger = logger.child({
//   namespace: ['Layout', 'Header', 'NavBar', 'Native', 'BackupNativePassphrase'],
// })

export const BackupPassphraseIndex = () => {
  const history = useHistory()
  // const {
  //   state: {},
  // } = useWallet()
  const [revealed, setRevealed] = useState<boolean>(false)
  const handleShow = () => {
    setRevealed(!revealed)
  }
  const [vault] = useState<Vault | null>(null)
  const [words] = useState<ReactNode[] | null>(null)

  // useEffect(() => {
  //   ;(async () => {})()
  // }, [])

  const placeholders = useMemo(() => {
    return range(1, 13).map(i => (
      <Tag
        p={2}
        flexBasis='31%'
        justifyContent='flex-start'
        fontSize='md'
        colorScheme='blue'
        key={i}
      >
        <Code mr={2}>{i}</Code>
        •••••••
      </Tag>
    ))
  }, [])

  return (
    <>
      <ModalHeader>
        <Text translation={'walletProvider.keepKey.modals.headings.wipeKeepKey'} />
      </ModalHeader>
      <ModalCloseButton />
      <ModalBody>
        <Text
          color='gray.500'
          translation={'walletProvider.keepKey.modals.descriptions.wipeKeepKey'}
          mb={6}
        />
        <Alert status='info'>
          <AlertIcon />
          <AlertDescription>
            <Text
              color='gray.500'
              translation={'walletProvider.keepKey.modals.descriptions.wipeKeepKey'}
              mb={6}
            />
          </AlertDescription>
        </Alert>

        <Wrap mt={12} mb={6}>
          {revealed ? words : placeholders}
        </Wrap>
      </ModalBody>
      <ModalFooter justifyContent='space-between'>
        <Button colorScheme='blue' variant='ghost' onClick={handleShow} leftIcon={<FaEye />}>
          <Text
            translation={`walletProvider.shapeShift.create.${revealed ? 'hide' : 'show'}Words`}
          />
        </Button>
        <Button
          colorScheme='blue'
          size='lg'
          disabled={!(vault && words)}
          onClick={() => {
            if (vault) {
              history.push(BackupPassphraseRoutes.Test, {
                vault,
              })
            }
          }}
        >
          <Text translation={'walletProvider.shapeShift.create.button'} />
        </Button>
      </ModalFooter>
    </>
  )
}
