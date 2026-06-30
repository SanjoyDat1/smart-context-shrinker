# Security Policy

## Supported versions

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |

## Reporting a vulnerability

**Please do not open public GitHub issues for security vulnerabilities.**

Report security issues privately by opening a [GitHub Security Advisory](https://github.com/SanjoyDat1/smart-context-shrinker/security/advisories/new) or emailing the repository owner via GitHub profile contact.

Include:

- Description of the vulnerability
- Steps to reproduce
- Potential impact (e.g., API key exposure, prompt injection bypass)
- Suggested fix if you have one

We aim to acknowledge reports within **48 hours** and provide a fix or mitigation timeline within **7 days** for confirmed issues.

## Security considerations

This library:

- Passes user message content to OpenAI for extraction — treat untrusted input accordingly
- Does not persist API keys — callers supply `openAiApiKey` per invocation
- Validates all LLM JSON output with Zod before use
- Wraps user content in XML delimiters and instructs the extractor to ignore embedded instructions

When integrating, never log full message arrays or API keys in production.
