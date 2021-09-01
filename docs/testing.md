## Testing

Bug fixes and features should always come with tests. If you want a visual representation of the test coverage of your code run [yarn test:coverage](README.md#yarn-test:coverage).

### Testing Tools

- Unit - test both frontend code in isolation
  - [jest](https://jestjs.io/docs/getting-started), [react testing library](https://testing-library.com/docs/react-testing-library/intro/), [react testing library hooks](https://github.com/testing-library/react-hooks-testing-library#example)
- E2E - to test the full stack completely on critical flows
  - [cypress](https://docs.cypress.io/guides/core-concepts/writing-and-organizing-tests)
    - When selecting dom elements use `data-testid` instead of using a class or id.

### Testing Ui Business Logic

Separate the business logic from the view as much as possible. Create hooks, helpers & reducers to utilize this logic from the ui and test that code in isolation from it's ui.

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

This is an example of how we structure our hook tests

```js
import { renderHook } from '@testing-library/react-hooks'
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
