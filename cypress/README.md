# Cypress

## Usage

### Running

Run using GUI: `yarn test:cypress`

Run headless: `test:cypress:headless`

### Linting

Lint: `lint:cypress`

Fix lint: `lint:cypress:fix`

## Writing tests

### Best practice

Follow [Cypress best practice](https://docs.cypress.io/guides/references/best-practices)

## Design decisions

- Cypress TypeScript definitions are [isolated to avoid Jest and Cypress type conflicts](https://docs.cypress.io/guides/tooling/typescript-support#Clashing-types-with-Jest): separate tsconfig.json used for Cypress
- Uses [Cypress's official ESLint plugin](https://github.com/cypress-io/eslint-plugin-cypress)
- `chromeWebSecurity` is disabled due to a [Cypress limitation with Cross-origin iframes](https://docs.cypress.io/guides/guides/web-security#Cross-origin-iframes)