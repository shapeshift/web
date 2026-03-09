## Global Programming Rules

### Code Quality & Style
- Look for opportunities to use existing code rather than creating new code
- Follow existing code conventions in each file/project
- Use existing libraries and utilities already present in the codebase
- Never assume a library is available - always check imports/package.json first
- Prefer composition over inheritance
- Write self-documenting code with clear variable and function names
- Keep functions small and focused on a single responsibility
- Avoid deep nesting - use early returns instead
- Prefer procedural and easy to understand code
- Avoid useEffect where practical - use it only when necessary and following best practices
- Choose the most straightforward approach that accomplishes the task
- Avoid "any" types - use specific type annotations instead
- For default values with user overrides, use computed values (useMemo) instead of useEffect - pattern: `userSelected ?? smartDefault ?? fallback`
- When function parameters are unused due to interface requirements, refactor the interface or implementation to remove them rather than prefixing with underscore

### Security & Best Practices
- Never expose, log, or commit secrets, API keys, or credentials
- Validate all inputs, especially user inputs
- Use parameterized queries to prevent SQL injection
- Sanitize data before displaying to prevent XSS
- Follow principle of least privilege
- Use HTTPS and secure communication protocols

### Error Handling
- Handle errors gracefully with meaningful messages
- Don't silently catch and ignore exceptions
- Log errors appropriately for debugging
- Provide fallback behavior when possible
- Use proper HTTP status codes in APIs

### Performance
- Avoid premature optimization, but be mindful of performance
- Use appropriate data structures for the task
- Minimize database queries and API calls
- Implement proper caching strategies
- Optimize images and assets for web delivery

### Testing
- Write tests for critical business logic
- Test edge cases and error conditions
- Use descriptive test names that explain behavior
- Keep tests isolated and independent
- Mock external dependencies appropriately

### Documentation & Communication
- Never add code comments unless explicitly requested
- When modifying code, do not add comments that reference previous implementations or explain what changed. Comments should only describe the current logic and functionality.
- Write clear commit messages explaining the "why"
- Use meaningful names for branches, variables, and functions
- Keep README files updated with setup and usage instructions

### Rule Management
- When user says "add that to the project rules": take previous guidance, form a rule, and add it to `.claude/guidelines/project-rules.md`
- When user says "add that to the global rules": take previous guidance, form a rule, and add it to `.claude/guidelines/global-rules.md`

---
