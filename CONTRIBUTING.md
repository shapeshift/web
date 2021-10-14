## Contributing Guidelines

### Conventional Commits

We use Conventional Commits for our PR titles. This allows automated tools like semantic-release to generate changelogs, bump versions according to semver, and release and publish the latest code. Please see https://www.conventionalcommits.org/en/v1.0.0/ for more information.

### Example

Please ensure your PR is named in accordance with the [@commitlint/config-conventional](https://github.com/conventional-changelog/commitlint/tree/master/@commitlint/config-conventional#type-enum) standard.

Prefixes can be one of the following
```
['build', 'chore', 'ci', 'docs', 'feat', 'fix', 'perf', 'refactor', 'revert', 'style', 'test']
```

✅ Examples of conforming PR titles (non-exhaustive):

```
feat: widgets can now do backflips
fix: something was broken
test: added more coverage to widget
```
