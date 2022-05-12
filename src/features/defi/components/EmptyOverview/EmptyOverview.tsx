import { Flex, ModalBody, ModalFooter, Stack } from '@chakra-ui/react'
import { Asset } from '@shapeshiftoss/types'
import { FaArrowRight } from 'react-icons/fa'
import { AssetIcon } from 'components/AssetIcon'

type EmptyOverviewProps = {
  assets: Asset[]
  footer?: React.ReactNode
}

export const EmptyOverview: React.FC<EmptyOverviewProps> = ({ children, footer, assets }) => {
  if (assets.length === 0) return null
  return (
    <Flex
      width='full'
      minWidth={{ base: '100%', xl: '500px' }}
      maxWidth='fit-content'
      flexDir='column'
    >
      <ModalBody textAlign='center'>
        <Stack py={8}>
          <Stack
            direction='row'
            justifyContent='center'
            alignItems='center'
            divider={
              <Flex px={4} border={0}>
                <FaArrowRight />
              </Flex>
            }
          >
            {assets.map(asset => (
              <AssetIcon src={asset?.icon} />
            ))}
          </Stack>
          <Stack justifyContent='center' fontWeight='medium'>
            {children}
          </Stack>
        </Stack>
      </ModalBody>
      {footer && <ModalFooter>{footer}</ModalFooter>}
    </Flex>
  )
}
