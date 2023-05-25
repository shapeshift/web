import type { ModalProps } from '@chakra-ui/react'
import {
  Button,
  Center,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  SimpleGrid,
  useRadioGroup,
} from '@chakra-ui/react'
import { useCallback, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { CircularProgress } from 'components/CircularProgress/CircularProgress'
import { GlobalFilter } from 'components/StakingVaults/GlobalFilter'
import { useGetNftUserTokensQuery } from 'state/apis/nft/nftApi'
import { selectWalletAccountIds } from 'state/slices/common-selectors'
import { useAppSelector } from 'state/store'

import { AvatarRadio } from './AvatarRadio'

type AvatarSelectModalProps = Pick<ModalProps, 'isOpen'> &
  Pick<ModalProps, 'onClose'> & { walletImage: string }

export const AvatarSelectModal: React.FC<AvatarSelectModalProps> = props => {
  const [selected, setSelected] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const translate = useTranslate()
  const accountIds = useAppSelector(selectWalletAccountIds)
  const { data, isLoading } = useGetNftUserTokensQuery({ accountIds })
  const filteredData = useMemo(
    () => data?.filter(item => item.token.medias[0].type === 'image'),
    [data],
  )
  const { onClose, walletImage } = props
  //Replace with the stored URL
  const defaultValue = walletImage

  const { getRootProps, getRadioProps } = useRadioGroup({
    name: 'framework',
    onChange: setSelected,
    defaultValue,
  })

  const group = getRootProps()

  const renderItems = useMemo(() => {
    return filteredData?.map(({ token }) => {
      const mediaUrl = token.medias?.[0]?.originalUrl
      return (
        <AvatarRadio
          key={`${token.collection.address}/${token.id}`}
          src={mediaUrl}
          {...getRadioProps({ value: mediaUrl })}
        />
      )
    })
  }, [filteredData, getRadioProps])

  const handleSaveChanges = useCallback(() => {
    onClose()
  }, [onClose])

  return (
    <Modal size='lg' {...props}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>{translate('avatar.modal.title')}</ModalHeader>
        {isLoading ? (
          <ModalBody>
            <Center py={12}>
              <CircularProgress />
            </Center>
          </ModalBody>
        ) : (
          <>
            <ModalBody pb={4} display='flex' flexDir='column' gap={4}>
              <GlobalFilter setSearchQuery={setSearchQuery} searchQuery={searchQuery} />
              <SimpleGrid
                gridGap={4}
                gridTemplateColumns={{ base: '1fr 1fr', md: '1fr 1fr 1fr' }}
                {...group}
              >
                <AvatarRadio
                  key={walletImage}
                  src={walletImage}
                  {...getRadioProps({ value: walletImage })}
                />
                {renderItems}
              </SimpleGrid>
            </ModalBody>
            <ModalFooter>
              <Button onClick={onClose}>{translate('common.cancel')}</Button>
              <Button ml={4} colorScheme='blue' onClick={handleSaveChanges}>
                {translate('common.saveChanges')}
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  )
}
