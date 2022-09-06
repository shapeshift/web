## Testing

Bug fixes and features should always come with tests.

### Testing Tools

- Unit - test both frontend code in isolation
  - [jest](https://jestjs.io/docs/getting-started), [react testing library](https://testing-library.com/docs/react-testing-library/intro/), [react testing library](https://testing-library.com/docs/react-testing-library/api/#renderhook)
- E2E - to test the full stack completely on critical flows
  - [cypress](https://docs.cypress.io/guides/core-concepts/writing-and-organizing-tests)
    - When selecting DOM elements [use `data-test-*` instead of using a `class` or `id`](https://docs.cypress.io/guides/references/best-practices#Selecting-Elements).
- Workflows - tools and libraries for GitHub Workflows or any DevOps processes
  - [act](https://github.com/nektos/act) - Emulates GitHub Workflows virtual environment via Docker containers.

### Testing UI Business Logic

Separate the business logic from the view as much as possible. Create hooks, helpers & reducers to utilize this logic from the UI and test that code in isolation from its UI.

# Unit Testing

This is an example of how we structure our unit tests.

```js
import mockAxios from 'axios'
import { isLoggedIn } from './isLoggedIn'

const UserData = { id: 1, name: 'UserName' }

const mockUserData = id => {
  mockAxios.get.mockImplementationOnce(() => Promise.resolve(id ? data : undefined))
}

describe('isLoggedIn', () => {
  describe('isLoggedIn', () => {
    it('should return true when passed a userId', () => {
      const userId = 1
      mockUserData(userId)
      expect(isLoggedIn(userId)).toBe(true)
    })

    it('should return false when userId is undefined', () => {
      const userId = undefined
      mockUserData(userId)
      expect(isLoggedIn(userId)).toBe(false)
    })
  })
})
```

# Hook Testing

This is an example of how we structure our hook tests.

```js
import { renderHook } from '@testing-library/react'
import { useIsComponentMounted } from './useIsComponentMounted'

const setup = () => {
  return renderHook(() => useIsComponentMounted())
}
describe('useIsComponentMounted hook', () => {
  it('should be true on render', () => {
    const { result } = setup()
    expect(result.current.current).toBe(true)
  })

  it('should false on unmount', () => {
    const { result, unmount } = setup()
    unmount()
    expect(result.current.current).toBe(false)
  })
})
```

### Workflow Testing

Requirements: 
- [act](https://github.com/nektos/act) - `brew install act`
  - Requires [Docker Desktop](https://docs.docker.com/get-docker/)
- [GitHub Personal Access Token](https://docs.github.com/en/actions/security-guides/automatic-token-authentication) - via GitHub Settings

Example command to test Cypress GitHub action:
```sh
# run from project root
act -s GITHUB_TOKEN=$GITHUB_TOKEN -j test-chrome --reuse
```

**NOTE:** there are two parameters set in the project's root `.actrc` file.

Two important flags that can be passed to the `act` command:
- `--reuse` - persist state across runs
- `--rm` - remove container on failure 
