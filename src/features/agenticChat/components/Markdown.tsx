import {
  Box,
  Code,
  Heading,
  Link,
  ListItem,
  OrderedList,
  Text,
  UnorderedList,
  useColorModeValue,
} from '@chakra-ui/react'
import { useMemo } from 'react'
import type { Components } from 'react-markdown'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

type MarkdownProps = {
  children: string
}

export const Markdown = ({ children }: MarkdownProps) => {
  const linkColor = useColorModeValue('blue.500', 'blue.300')
  const inlineCodeBg = useColorModeValue('gray.100', 'gray.700')
  const codeBlockBg = useColorModeValue('gray.900', 'black')
  const codeBlockText = useColorModeValue('white', 'white')
  const blockquoteBorderColor = useColorModeValue('gray.300', 'gray.600')
  const tableBorderColor = useColorModeValue('gray.200', 'gray.700')
  const tableHeaderBg = useColorModeValue('gray.50', 'gray.800')

  const components: Components = useMemo(
    () => ({
      h1: ({ children }) => (
        <Heading as='h1' size='xl' mb={6} mt={8} _first={{ mt: 0 }} _last={{ mb: 0 }}>
          {children}
        </Heading>
      ),
      h2: ({ children }) => (
        <Heading as='h2' size='lg' mb={4} mt={6} _first={{ mt: 0 }} _last={{ mb: 0 }}>
          {children}
        </Heading>
      ),
      h3: ({ children }) => (
        <Heading as='h3' size='md' mb={3} mt={5} _first={{ mt: 0 }} _last={{ mb: 0 }}>
          {children}
        </Heading>
      ),
      h4: ({ children }) => (
        <Heading as='h4' size='sm' mb={3} mt={4} _first={{ mt: 0 }} _last={{ mb: 0 }}>
          {children}
        </Heading>
      ),
      h5: ({ children }) => (
        <Heading as='h5' size='xs' mb={2} mt={3} _first={{ mt: 0 }} _last={{ mb: 0 }}>
          {children}
        </Heading>
      ),
      h6: ({ children }) => (
        <Heading as='h6' size='xs' mb={2} mt={3} _first={{ mt: 0 }} _last={{ mb: 0 }}>
          {children}
        </Heading>
      ),
      p: ({ children }) => (
        <Text mb={4} mt={4} _first={{ mt: 0 }} _last={{ mb: 0 }}>
          {children}
        </Text>
      ),
      a: ({ href, children }) => (
        <Link href={href} color={linkColor} textDecoration='underline' isExternal>
          {children}
        </Link>
      ),
      blockquote: ({ children }) => (
        <Box
          as='blockquote'
          borderLeftWidth='2px'
          borderLeftColor={blockquoteBorderColor}
          pl={4}
          py={2}
          my={4}
          fontStyle='italic'
        >
          {children}
        </Box>
      ),
      ul: ({ children }) => (
        <UnorderedList my={4} ml={6} spacing={2}>
          {children}
        </UnorderedList>
      ),
      ol: ({ children }) => (
        <OrderedList my={4} ml={6} spacing={2}>
          {children}
        </OrderedList>
      ),
      li: ({ children }) => <ListItem>{children}</ListItem>,
      hr: () => <Box as='hr' my={6} borderColor={tableBorderColor} />,
      del: ({ children }) => <span>{children}</span>,
      table: ({ children }) => (
        <Box
          as='table'
          my={5}
          width='100%'
          borderWidth='1px'
          borderColor={tableBorderColor}
          borderRadius='md'
          overflow='hidden'
        >
          {children}
        </Box>
      ),
      thead: ({ children }) => (
        <Box as='thead' bg={tableHeaderBg}>
          {children}
        </Box>
      ),
      tbody: ({ children }) => <Box as='tbody'>{children}</Box>,
      tr: ({ children }) => (
        <Box
          as='tr'
          borderBottomWidth='1px'
          borderColor={tableBorderColor}
          _last={{ borderBottom: 'none' }}
        >
          {children}
        </Box>
      ),
      th: ({ children }) => (
        <Box as='th' px={4} py={2} textAlign='left' fontWeight='bold'>
          {children}
        </Box>
      ),
      td: ({ children }) => (
        <Box as='td' px={4} py={2}>
          {children}
        </Box>
      ),
      pre: ({ children }) => (
        <Box
          as='pre'
          bg={codeBlockBg}
          color={codeBlockText}
          p={4}
          borderRadius='md'
          overflowX='auto'
          my={4}
        >
          {children}
        </Box>
      ),
      code: ({ node, children }) => {
        const isInline = node?.position?.start.line === node?.position?.end.line
        if (isInline) {
          return (
            <Code bg={inlineCodeBg} px={1} borderRadius='sm' fontSize='0.9em'>
              {children}
            </Code>
          )
        }
        return <code>{children}</code>
      },
    }),
    [
      linkColor,
      inlineCodeBg,
      codeBlockBg,
      codeBlockText,
      blockquoteBorderColor,
      tableBorderColor,
      tableHeaderBg,
    ],
  )

  return (
    <Box>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {children}
      </ReactMarkdown>
    </Box>
  )
}
