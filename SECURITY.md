# Security Policy

## Sensitive Information

This project contains several types of sensitive information that should NEVER be shared publicly or committed to a public repository:

### API Keys and Credentials
- Gemini API keys
- WhatsApp authentication tokens
- Any other third-party API keys

### Configuration Files
- `.env` files containing environment variables
- `config.json` files with API keys or sensitive settings
- Any file containing passwords, tokens, or secrets

### User Data
- Contact information
- Chat histories
- Message logs
- User credentials

### Session Data
- WhatsApp session files in `backend/sessions/`
- Authentication tokens
- Login cookies

## Protecting Sensitive Information

### Using .gitignore
The project includes a comprehensive `.gitignore` file that prevents sensitive files from being committed. Make sure it's properly configured and working by checking:

```bash
git status
```

### Using Environment Variables
- Store sensitive information in `.env` files
- Never commit `.env` files to the repository
- Use `.env.example` files as templates without real credentials

### Using Template Files
- Use `.example` versions of configuration files
- Document required fields without including actual values
- Instruct users to copy and configure these files locally

## Before Committing Code

Always check the following before committing code:

1. Run `git status` to see what files will be committed
2. Check for any sensitive files that might have been missed by `.gitignore`
3. Review changes with `git diff --staged` to ensure no secrets are included
4. Consider using a pre-commit hook to prevent accidental commits of sensitive data

## Reporting Security Issues

If you discover a security vulnerability or notice that sensitive information has been committed to the repository:

1. Do not create a public issue
2. Immediately remove the sensitive information if possible
3. Consider rotating any exposed credentials
4. Contact the repository owner directly

## Best Practices

- Regularly audit your repository for sensitive information
- Use environment variables for all secrets
- Consider using a secrets management solution for production deployments
- Rotate credentials regularly, especially if there's any suspicion they might have been exposed
