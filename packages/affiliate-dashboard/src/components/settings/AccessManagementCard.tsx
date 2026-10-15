import {
  AlertDialog,
  AlertDialogBody,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogOverlay,
  Badge,
  Box,
  Button,
  CloseButton,
  Flex,
  HStack,
  Input,
  Stack,
  Text,
} from '@chakra-ui/react'
import { useRef, useState } from 'react'

import type { ActionMessage } from '../../hooks/useAffiliateActions'
import { useAffiliateMembers } from '../../hooks/useAffiliateMembers'
import { EVM_ADDRESS_REGEX, formatDate } from '../../lib/format'
import { SettingsCard } from './SettingsCard'

interface AccessManagementCardProps {
  affiliateAddress: string
  authHeaders: Record<string, string>
  setMessage: (message: ActionMessage | null) => void
}

export const AccessManagementCard = ({
  affiliateAddress,
  authHeaders,
  setMessage,
}: AccessManagementCardProps): React.JSX.Element => {
  const [address, setAddress] = useState('')
  const [pendingRemoval, setPendingRemoval] = useState<string | null>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)
  const { query, isAdding, isRemoving, addMember, removeMember } = useAffiliateMembers({
    affiliateAddress,
    authHeaders,
    setMessage,
  })

  const handleAdd = async (): Promise<void> => {
    const trimmed = address.trim()
    if (!EVM_ADDRESS_REGEX.test(trimmed)) {
      setMessage({ type: 'error', text: 'Invalid EVM address' })
      return
    }
    try {
      await addMember(trimmed)
      setAddress('')
    } catch {
      // error surfaced via useAffiliateMembers.onError; preserve input for retry
    }
  }

  const handleRemove = async (): Promise<void> => {
    if (!pendingRemoval) return
    try {
      await removeMember(pendingRemoval)
    } catch {
      // error surfaced via useAffiliateMembers.onError
    } finally {
      setPendingRemoval(null)
    }
  }

  return (
    <SettingsCard
      title='Authorized Wallets'
      description='Wallets that can sign in and manage this affiliate.'
    >
      <Stack spacing={4}>
        {query.isLoading && (
          <Text fontSize='sm' color='fg.muted'>
            Loading...
          </Text>
        )}
        {query.error && (
          <Text fontSize='sm' color='danger'>
            {query.error.message}
          </Text>
        )}
        <Stack spacing={0}>
          {(query.data ?? []).map(member => {
            const isSelf = member.walletAddress.toLowerCase() === affiliateAddress.toLowerCase()
            const canRemove = member.role === 'admin' && !isSelf
            return (
              <Flex
                key={member.walletAddress}
                justify='space-between'
                align='center'
                gap={4}
                py={2}
                borderBottom='1px solid'
                borderColor='border.muted'
                _last={{ borderBottom: 'none' }}
              >
                <HStack spacing={3} minW={0}>
                  <Text
                    fontSize='sm'
                    fontWeight={500}
                    color='fg.bright'
                    fontFamily='mono'
                    wordBreak='break-all'
                  >
                    {member.walletAddress}
                  </Text>
                  <Badge
                    variant='subtle'
                    colorScheme={member.role === 'owner' ? 'blue' : 'gray'}
                    textTransform='capitalize'
                    flexShrink={0}
                  >
                    {member.role}
                  </Badge>
                </HStack>
                <HStack spacing={3} flexShrink={0}>
                  <Text fontSize='xs' color='fg.muted' display={{ base: 'none', md: 'block' }}>
                    {member.role === 'owner' ? 'Registered' : 'Added'}{' '}
                    {formatDate(member.createdAt)}
                  </Text>
                  <Box w={6} h={6} flexShrink={0}>
                    {canRemove && (
                      <CloseButton
                        size='sm'
                        aria-label={`Remove ${member.walletAddress}`}
                        isDisabled={isRemoving}
                        onClick={() => setPendingRemoval(member.walletAddress)}
                      />
                    )}
                  </Box>
                </HStack>
              </Flex>
            )
          })}
        </Stack>
        <HStack spacing={3} wrap='wrap'>
          <Input
            value={address}
            onChange={e => setAddress(e.target.value)}
            placeholder='Wallet address'
            spellCheck={false}
            w='46ch'
            maxW='100%'
          />
          <Button
            onClick={() => void handleAdd()}
            isDisabled={!address.trim()}
            isLoading={isAdding}
            loadingText='Adding...'
          >
            Add admin
          </Button>
        </HStack>
      </Stack>
      <AlertDialog
        isOpen={pendingRemoval !== null}
        leastDestructiveRef={cancelRef}
        onClose={() => setPendingRemoval(null)}
        isCentered
      >
        <AlertDialogOverlay>
          <AlertDialogContent bg='bg.surface' border='1px solid' borderColor='border.subtle'>
            <AlertDialogHeader fontSize='md' fontWeight={600} color='fg.bright'>
              Remove admin
            </AlertDialogHeader>
            <AlertDialogBody fontSize='sm' color='fg.muted'>
              This wallet will no longer be able to sign in and manage this affiliate.
              <Text mt={3} fontFamily='mono' color='fg.bright' wordBreak='break-all'>
                {pendingRemoval}
              </Text>
            </AlertDialogBody>
            <AlertDialogFooter gap={3}>
              <Button
                ref={cancelRef}
                variant='outline'
                colorScheme='gray'
                borderColor='border.input'
                color='fg.default'
                onClick={() => setPendingRemoval(null)}
              >
                Cancel
              </Button>
              <Button
                bg='red.700'
                color='white'
                _hover={{ bg: 'red.800' }}
                _active={{ bg: 'red.900' }}
                isLoading={isRemoving}
                onClick={() => void handleRemove()}
              >
                Remove
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </SettingsCard>
  )
}
