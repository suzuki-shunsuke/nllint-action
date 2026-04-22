# nllint-action

GitHub Action to fix newlines and whitespace issues — a pure JavaScript port of [nllint](https://github.com/suzuki-shunsuke/nllint) (no external Go binaries required).

[action.yaml](action.yaml)

## Usage

```yaml
- uses: suzuki-shunsuke/nllint-action@latest
  with:
    fix: true
    github_token: ${{ steps.token.outputs.token }}
    files: ${{ inputs.files }}
```

## Behavior

- Replaces full-width spaces (U+3000) with ASCII spaces.
- Ensures every file ends with a single newline.
- When `trim_space=true`, trims leading/trailing whitespace of the whole file.
- When `trim_trailing_space=true`, strips trailing whitespace from each line.
- In `fix=true` mode, commits the fixes via GitHub Contents API (message: `style(nllint): format code`).
