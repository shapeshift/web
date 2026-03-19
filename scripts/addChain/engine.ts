import fs from 'node:fs'
import ts from 'typescript'

function readFile(filePath: string): string {
  return fs.readFileSync(filePath, 'utf8')
}

function writeFile(filePath: string, content: string): void {
  fs.writeFileSync(filePath, content, 'utf8')
}

function parseSource(filePath: string, src: string): ts.SourceFile {
  return ts.createSourceFile(filePath, src, ts.ScriptTarget.Latest, true)
}

/**
 * Find closing brace/bracket position of a named declaration and insert snippet before it.
 * Works with enums, interfaces, object literals, and array literals.
 */
export function insertIntoNamedNode(
  filePath: string,
  targetName: string,
  snippet: string,
  idempotencyKey: string,
): boolean {
  const src = readFile(filePath)
  if (src.includes(idempotencyKey)) return false

  const sourceFile = parseSource(filePath, src)
  let insertPos = -1

  function visit(node: ts.Node): void {
    if (insertPos !== -1) return

    if (ts.isEnumDeclaration(node) && node.name.text === targetName) {
      // Insert before closing `}`
      insertPos = node.end - 1
      return
    }

    if (ts.isInterfaceDeclaration(node) && node.name.text === targetName) {
      insertPos = node.end - 1
      return
    }

    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.name.text === targetName
    ) {
      const init = node.initializer
      if (!init) return

      if (ts.isObjectLiteralExpression(init) || ts.isArrayLiteralExpression(init)) {
        insertPos = init.end - 1
        return
      }

      // Handle `as const` or type assertion wrapping
      if (ts.isAsExpression(init) || ts.isTypeAssertionExpression(init)) {
        const inner = ts.isAsExpression(init)
          ? init.expression
          : (init as ts.TypeAssertion).expression
        if (ts.isObjectLiteralExpression(inner) || ts.isArrayLiteralExpression(inner)) {
          insertPos = inner.end - 1
          return
        }
      }
    }

    ts.forEachChild(node, visit)
  }

  ts.forEachChild(sourceFile, visit)

  if (insertPos === -1) {
    console.warn(`[engine] Could not find named node "${targetName}" in ${filePath}`)
    return false
  }

  const result = src.slice(0, insertPos) + snippet + src.slice(insertPos)
  writeFile(filePath, result)
  return true
}

/**
 * Insert a case/clause into a switch statement inside a named function or variable.
 * Inserts before the `default:` case if present, otherwise before the switch closing `}`.
 */
export function insertIntoSwitch(
  filePath: string,
  funcName: string,
  snippet: string,
  idempotencyKey: string,
): boolean {
  const src = readFile(filePath)
  if (src.includes(idempotencyKey)) return false

  const sourceFile = parseSource(filePath, src)
  let switchNode: ts.SwitchStatement | undefined
  let found = false

  function findSwitch(node: ts.Node): void {
    if (found) return

    const isTarget =
      (ts.isFunctionDeclaration(node) && node.name?.text === funcName) ||
      (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === funcName)

    if (isTarget) {
      findSwitchInner(node)
      return
    }

    ts.forEachChild(node, findSwitch)
  }

  function findSwitchInner(node: ts.Node): void {
    if (found) return
    if (ts.isSwitchStatement(node)) {
      switchNode = node
      found = true
      return
    }
    ts.forEachChild(node, findSwitchInner)
  }

  ts.forEachChild(sourceFile, findSwitch)

  if (!switchNode) {
    console.warn(`[engine] Could not find switch in "${funcName}" in ${filePath}`)
    return false
  }

  const caseBlock = switchNode.caseBlock
  let insertPos = -1

  // Find the default clause position
  for (const clause of caseBlock.clauses) {
    if (ts.isDefaultClause(clause)) {
      insertPos = clause.getStart(sourceFile)
      break
    }
  }

  // No default clause - insert before closing `}` of the case block
  if (insertPos === -1) {
    insertPos = caseBlock.end - 1
  }

  const result = src.slice(0, insertPos) + snippet + src.slice(insertPos)
  writeFile(filePath, result)
  return true
}

/**
 * Add a named import to an existing import statement for a specific module path.
 * e.g. addNamedImport(file, 'viem/chains', 'abstract')
 */
export function addNamedImport(filePath: string, modulePath: string, importName: string): boolean {
  const src = readFile(filePath)
  if (src.includes(idempotencyKeyForImport(importName, modulePath))) return false

  const sourceFile = parseSource(filePath, src)
  let targetImport: ts.ImportDeclaration | undefined

  ts.forEachChild(sourceFile, node => {
    if (ts.isImportDeclaration(node)) {
      const moduleSpec = node.moduleSpecifier
      if (ts.isStringLiteral(moduleSpec) && moduleSpec.text === modulePath) {
        targetImport = node
      }
    }
  })

  if (!targetImport) {
    // No existing import for this module - create a new one
    const newImport = `import { ${importName} } from '${modulePath}'\n`
    return appendAfterLastImport(filePath, newImport, importName)
  }

  const namedBindings = targetImport.importClause?.namedBindings
  if (!namedBindings || !ts.isNamedImports(namedBindings)) {
    console.warn(`[engine] Import for "${modulePath}" in ${filePath} does not have named bindings`)
    return false
  }

  // Insert after the last named import element
  const elements = namedBindings.elements
  if (elements.length === 0) {
    // Empty named imports `import {} from '...'` - insert inside braces
    const insertPos = namedBindings.getStart(sourceFile) + 1
    const result = src.slice(0, insertPos) + ` ${importName} ` + src.slice(insertPos)
    writeFile(filePath, result)
    return true
  }

  const lastElement = elements[elements.length - 1]
  const insertPos = lastElement.end
  // Check if there's already a trailing comma
  const afterLast = src.slice(insertPos, namedBindings.end).trimStart()
  const needsComma = !afterLast.startsWith(',')
  const prefix = needsComma ? ',' : ''

  // Find the position after the optional trailing comma
  let actualInsertPos = insertPos
  if (!needsComma) {
    // There's already a comma, find it and insert after
    const commaIdx = src.indexOf(',', insertPos)
    if (commaIdx !== -1 && commaIdx < namedBindings.end) {
      actualInsertPos = commaIdx + 1
    }
  }

  const insertText = needsComma ? `${prefix} ${importName}` : ` ${importName},`
  const result = src.slice(0, actualInsertPos) + insertText + src.slice(actualInsertPos)
  writeFile(filePath, result)
  return true
}

function idempotencyKeyForImport(importName: string, _modulePath: string): string {
  // Use "  importName," (with leading spaces and trailing comma) to avoid
  // false-positive matches when importName appears in code (e.g. "foo.bar" or "[fooChainId]")
  return `  ${importName},`
}

/**
 * Add a full import line if an idempotency key is not already present in the file.
 * Creates a new import statement after existing imports.
 */
export function addImportLine(
  filePath: string,
  importStatement: string,
  idempotencyKey: string,
): boolean {
  const src = readFile(filePath)
  if (src.includes(idempotencyKey)) return false

  return appendAfterLastImport(filePath, importStatement + '\n', idempotencyKey)
}

/**
 * Append a line after a regex-matched line.
 * Used for .env files, config.ts env vars, vite-env.d.ts, etc.
 */
export function appendLineAfterPattern(
  filePath: string,
  pattern: RegExp,
  line: string,
  idempotencyKey: string,
): boolean {
  const src = readFile(filePath)
  if (src.includes(idempotencyKey)) return false

  const match = pattern.exec(src)
  if (!match) {
    console.warn(`[engine] Pattern ${pattern} not found in ${filePath}`)
    return false
  }

  const matchEnd = match.index + match[0].length
  // Find end of the line
  const lineEnd = src.indexOf('\n', matchEnd)
  const insertPos = lineEnd === -1 ? src.length : lineEnd + 1

  const result = src.slice(0, insertPos) + line + '\n' + src.slice(insertPos)
  writeFile(filePath, result)
  return true
}

/**
 * Append a line after the LAST occurrence of a regex-matched line.
 * Use this instead of appendLineAfterPattern when the anchor pattern may appear multiple times
 * (e.g. after adding chain A, adding chain B should go after chain A, not after the original anchor).
 */
export function appendLineAfterLastPattern(
  filePath: string,
  pattern: RegExp,
  line: string,
  idempotencyKey: string,
): boolean {
  const src = readFile(filePath)
  if (src.includes(idempotencyKey)) return false

  const flags = pattern.flags.includes('g') ? pattern.flags : pattern.flags + 'g'
  const globalPattern = new RegExp(pattern.source, flags)
  const matches = [...src.matchAll(globalPattern)]
  if (!matches.length) {
    console.warn(`[engine] Pattern ${pattern} not found in ${filePath}`)
    return false
  }

  // Use the LAST match so new entries always go after previously-inserted entries
  const match = matches[matches.length - 1]
  const matchEnd = (match.index ?? 0) + match[0].length
  const lineEnd = src.indexOf('\n', matchEnd)
  const insertPos = lineEnd === -1 ? src.length : lineEnd + 1

  const result = src.slice(0, insertPos) + line + '\n' + src.slice(insertPos)
  writeFile(filePath, result)
  return true
}

/**
 * Append a line after EVERY occurrence of a regex-matched line.
 * Used when the same line pattern appears in multiple places (e.g. destructuring + expect array).
 */
export function appendLineAfterAllPatterns(
  filePath: string,
  pattern: RegExp,
  line: string,
  idempotencyKey: string,
): boolean {
  const src = readFile(filePath)
  if (src.includes(idempotencyKey)) return false

  const flags = pattern.flags.includes('g') ? pattern.flags : pattern.flags + 'g'
  const globalPattern = new RegExp(pattern.source, flags)
  const matches = [...src.matchAll(globalPattern)]
  if (!matches.length) {
    console.warn(`[engine] Pattern ${pattern} not found in ${filePath}`)
    return false
  }

  // Process matches in reverse order to preserve positions
  let result = src
  for (let i = matches.length - 1; i >= 0; i--) {
    const match = matches[i]
    const matchEnd = (match.index ?? 0) + match[0].length
    const lineEnd = result.indexOf('\n', matchEnd)
    const insertPos = lineEnd === -1 ? result.length : lineEnd + 1
    result = result.slice(0, insertPos) + line + '\n' + result.slice(insertPos)
  }
  writeFile(filePath, result)
  return true
}

/**
 * Append code after the last import statement in the file.
 * If no imports found, prepend to the file.
 */
export function appendAfterLastImport(
  filePath: string,
  code: string,
  idempotencyKey: string,
): boolean {
  const src = readFile(filePath)
  if (src.includes(idempotencyKey)) return false

  const sourceFile = parseSource(filePath, src)
  let lastImportEnd = -1

  ts.forEachChild(sourceFile, node => {
    if (ts.isImportDeclaration(node)) {
      const end = node.end
      if (end > lastImportEnd) {
        lastImportEnd = end
      }
    }
  })

  let insertPos: number
  if (lastImportEnd === -1) {
    // No imports found, prepend
    insertPos = 0
  } else {
    // Find end of line after last import
    const lineEnd = src.indexOf('\n', lastImportEnd)
    insertPos = lineEnd === -1 ? lastImportEnd : lineEnd + 1
  }

  const result = src.slice(0, insertPos) + code + src.slice(insertPos)
  writeFile(filePath, result)
  return true
}

/**
 * Low-level: find a string in a file and insert text before or after it.
 */
export function insertAtPosition(
  filePath: string,
  searchStr: string,
  insertBefore: boolean,
  text: string,
  idempotencyKey?: string,
): boolean {
  const src = readFile(filePath)

  if (idempotencyKey && src.includes(idempotencyKey)) return false

  const idx = src.indexOf(searchStr)
  if (idx === -1) {
    console.warn(`[engine] Search string not found in ${filePath}: "${searchStr.slice(0, 60)}..."`)
    return false
  }

  const insertPos = insertBefore ? idx : idx + searchStr.length
  const result = src.slice(0, insertPos) + text + src.slice(insertPos)
  writeFile(filePath, result)
  return true
}
