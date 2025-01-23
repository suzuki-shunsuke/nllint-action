# nllint-action

[![License](http://img.shields.io/badge/license-mit-blue.svg?style=flat-square)](https://raw.githubusercontent.com/suzuki-shunsuke/nllint-action/main/LICENSE)

GitHub Action to fix newlines using [nllint](https://github.com/suzuki-shunsuke/nllint)

[action.yaml](action.yaml)

## Usage

```yaml
- uses: suzuki-shunsuke/nllint-action@main
  with:
    fix: true
    github_token: ${{steps.token.outputs.token}}
    files: ${{inputs.files}}
```
