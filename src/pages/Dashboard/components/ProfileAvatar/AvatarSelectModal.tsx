import type { ModalProps } from '@chakra-ui/react'
import {
  Button,
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
    console.info(selected)
    onClose()
  }, [onClose, selected])

  return (
    <Modal size='lg' {...props}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Set a New Avatar</ModalHeader>
        <ModalBody pb={4} display='flex' flexDir='column' gap={4}>
          <GlobalFilter setSearchQuery={setSearchQuery} searchQuery={searchQuery} />
          <SimpleGrid gridGap={4} gridTemplateColumns='1fr 1fr 1fr' {...group}>
            <AvatarRadio
              key={walletImage}
              src={walletImage}
              {...getRadioProps({ value: walletImage })}
            />
            {renderItems}
          </SimpleGrid>
        </ModalBody>
        <ModalFooter>
          <Button onClick={onClose}>Cancel</Button>
          <Button ml={4} colorScheme='blue' onClick={handleSaveChanges}>
            Save Changes
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}
