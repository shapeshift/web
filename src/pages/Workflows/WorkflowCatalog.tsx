import {
  Badge,
  Box,
  Container,
  Flex,
  Grid,
  Heading,
  Text,
  useColorModeValue,
} from '@chakra-ui/react'
import { memo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

import { WORKFLOW_TEMPLATES } from '@/lib/workflows/templates'
import type { WorkflowTemplate } from '@/lib/workflows/types'

const STUB_TEMPLATE_IDS = new Set(['swap-open-perp'])

type WorkflowCardProps = {
  template: WorkflowTemplate
  onClick: (id: string) => void
}

const WorkflowCard = memo(({ template, onClick }: WorkflowCardProps) => {
  const borderColor = useColorModeValue('gray.200', 'gray.600')
  const bg = useColorModeValue('white', 'gray.800')
  const hoverBg = useColorModeValue('gray.50', 'gray.700')
  const mutedColor = useColorModeValue('gray.600', 'gray.400')

  const isStub = STUB_TEMPLATE_IDS.has(template.id)

  const handleClick = useCallback(() => {
    if (!isStub) onClick(template.id)
  }, [isStub, onClick, template.id])

  return (
    <Box
      borderWidth={1}
      borderColor={borderColor}
      borderRadius='xl'
      bg={bg}
      p={5}
      cursor={isStub ? 'default' : 'pointer'}
      opacity={isStub ? 0.6 : 1}
      _hover={isStub ? {} : { bg: hoverBg }}
      onClick={handleClick}
      transition='background 0.15s'
    >
      <Flex justifyContent='space-between' alignItems='flex-start' mb={2}>
        <Heading size='sm'>{template.name}</Heading>
        {isStub && (
          <Badge colorScheme='yellow' fontSize='xs'>
            Coming soon
          </Badge>
        )}
      </Flex>
      <Text fontSize='sm' color={mutedColor} mb={3}>
        {template.description}
      </Text>
      <Flex gap={1} flexWrap='wrap'>
        {template.tags.map(tag => (
          <Badge key={tag} colorScheme='blue' variant='subtle' fontSize='xs'>
            {tag}
          </Badge>
        ))}
      </Flex>
    </Box>
  )
})

WorkflowCard.displayName = 'WorkflowCard'

export const WorkflowCatalog = memo(() => {
  const navigate = useNavigate()

  const handleSelect = useCallback(
    (templateId: string) => {
      navigate(`/workflows/${templateId}`)
    },
    [navigate],
  )

  return (
    <Container maxW='container.lg' py={8}>
      <Heading size='lg' mb={2}>
        Workflows
      </Heading>
      <Text color={useColorModeValue('gray.600', 'gray.400')} mb={8}>
        Automate multi-step actions across swaps, staking, and more.
      </Text>
      <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }} gap={4}>
        {WORKFLOW_TEMPLATES.map(template => (
          <WorkflowCard key={template.id} template={template} onClick={handleSelect} />
        ))}
      </Grid>
    </Container>
  )
})

WorkflowCatalog.displayName = 'WorkflowCatalog'
