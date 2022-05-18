# Cypress

## Usage

### Running

Run using GUI: `yarn test:cypress`

Run headless: `test:cypress:headless`

### Linting

Lint: `lint:cypress`

Fix lint: `lint:cypress:fix`

## Writing tests

**Where do I put them?**

Add to an existing file in `cypress/integration`, or create your own if the tests fall into a new category.

For test files to be recognised by Cypress they must be appended with `_spec`. For example, if we are testing a staking page, we might name the test file `staking_spec.ts`.

**How do I find the element I want to test with Cypress?**

If it already has a `data-test-*` tag, you can use `cy.getBySel('some-tag')`. If not, add your own to the element.

Targeting the element by `tag`, `class` or `id` is very volatile and highly subject to change. We may swap out the element, refactor CSS and update ID's, or add or remove classes that affect the style of the element.
Instead, adding the `data-test` attribute to the element gives us a targeted selector that's only used for testing.

See best [the docs on best practice for selectors](https://docs.cypress.io/guides/references/best-practices#How-It-Works) for more information.

### Best practice

Follow [Cypress best practice](https://docs.cypress.io/guides/references/best-practices)

## Design decisions

- Implementation in line with [Cypress Best Practices](https://docs.cypress.io/guides/references/best-practices)
- Cypress TypeScript definitions are [isolated to avoid Jest and Cypress type conflicts](https://docs.cypress.io/guides/tooling/typescript-support#Clashing-types-with-Jest): separate `tsconfig.json` used for Cypress
- Uses [Cypress's official ESLint plugin](https://github.com/cypress-io/eslint-plugin-cypress)
- `chromeWebSecurity` is disabled due to a [Cypress limitation with Cross-origin iframes](https://docs.cypress.io/guides/guides/web-security#Cross-origin-iframes)
- Does not visit external sites (this prevents us from testing some flows, such as Portis login) via the UI, as this is considered a [Cypress anti-pattern](https://docs.cypress.io/guides/references/best-practices#Visiting-external-sites). One way to overcome this in the future is to interact with third-party servers programmatically - though this should be done sparingly, see point below.
- Minimises interaction with third-party servers, i.e. those that we do not control, where possible - see best practice [here](https://docs.cypress.io/guides/references/best-practices#3rd-party-servers). Acceptable exceptions include testing critical flows.
- [Prefers stubbed responses from ShapeShift-controlled servers](https://docs.cypress.io/guides/references/best-practices#3rd-party-servers) over full E2E tests. Full E2E is only recommended for testing critical paths. It also helps us overcome the issues inherent with testing _real_ addresses - unless we run a separate node, we cannot ensure the wallet properties remain static.
- Use Typescript `factories` instead of the Cypress default of JSON `fixtures` to give us type safety, reduce test data coupling, and minimize duplicate code

### How to enable auto-recording of mock data

To allow for auto-recording and stubbing to work, require `cypress/plugins/autorecord` in each of your test files and call the function at the beginning of your parent `describe` block.

```ts
import { autoRecord } from '../plugins/autorecord'

describe('Home Page', () => {
  autoRecord() // Call the autoRecord function at the beginning of your describe block
  // Your hooks (beforeEach, afterEach, etc) goes here
  it('...', () => {
    // Your test goes here
  })
})
```

## ENV Variables

| Name               | Default         | Description                                                                                             |
|--------------------|-----------------|---------------------------------------------------------------------------------------------------------|
| `whitelistHeaders` | `[]`            | save only headers you need to reduce file size                                                          |
| `includeHosts`     | `[]`            | whitelist hosts for recording/stubbing. Any host which is not present in `includeHosts` will be skipped |
| `mocksFolder`      | `cypress/mocks` | Path to folder containing mock files                                                                    |
| `mocksName`        | spec name       | File name to write/read mocks                                                                           |
| `recordTests`      | `[]`            | [Updating Mocks](#updating-mocks)                                                                       |
| `forceRecord`      | `false`         | [Updating Mocks](#updating-mocks)                                                                       |
| `cleanMocks`       | `false`         | [Removing Stale Mocks](#removing-stale-mocks)                                                           |

## Updating Mocks

In the case you need to update your mocks for a particular test add the test name in the file `cypress.json`:

```json
{
  "env": {    
    "recordTests": ["my awesome test"]
  }
}
```

Alternatively, you can update recordings for all tests by setting `forceRecord` to `true` before rerunning your tests:

```json
{
  "env": {    
    "forceRecord": true
  }
}
```

Alternatively, `yarn test:cypress:rerecord`

## Removing Stale Mocks

Stale mocks that are no longer being used can be automatically removed when you run your tests by setting `cleanMocks` to `true` in the file `cypress.json`:

```json
{
  "env": {
    "cleanMocks": true
  }
}
```

Alternatively, run `yarn test:cypress:clean`

## Command Line Usage

You can specify any variable from a command line.

Force record:

```bash
yarn test:cypress --env forceRecord=true
```
