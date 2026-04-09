# Contributing to BOOM House Discord Bot

Thanks for your interest in contributing! This document outlines the process for contributing code, reporting issues, or suggesting enhancements.

## Code of Conduct

Please be respectful and constructive in all interactions. Harassment or unprofessional behavior will not be tolerated.

## How to Contribute

### Reporting Bugs

- Use the **Bug Report** issue template.
- Include clear steps to reproduce, expected vs. actual behavior, and relevant environment details.
- Check existing issues first to avoid duplicates.

### Suggesting Features

- Use the **Feature Request** issue template.
- Explain the motivation and proposed solution clearly.
- Be open to discussion and alternative approaches.

### Submitting Code Changes

1. **Fork** the repository and create a new branch from `main`.

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up environment variables**:
   Copy `.env.example` to `.env` and fill in required values.

4. **Make your changes**:
   - Follow existing code style (ESLint config provided).
   - Write clear commit messages.
   - Add comments for complex logic.

5. **Test your changes**:
   - Run `npm run build` to verify no TypeScript errors.
   - If possible, test commands in a development Discord server.

6. Push your branch and open a Pull Request using the PR template.

7. Link related issues in the PR description (e.g., `Closes #42`).

## Development Guidelines

- **TypeScript**: All new code should be typed.
- **Environment Variables**: Use `requireEnv()` from `utils/config.ts` for critical values.
- **Database**: Prefer using helpers in `utils/dbHelper.ts` for user/account operations.
- **Discord API**: Use wrappers in `utils/discordApi.ts` when possible.
- **Error Handling**: Provide user-friendly error messages with appropriate emojis.

## Adding a New Command

1. Create a new file in `commands/` (e.g., `commands/mycommand.ts`).
2. Export an object with `data` (command definition) and `execute` function.
3. If the command has buttons/modals, include a `handlers` object.
4. Register commands with `npm run register` after merging.

## Database Migrations

If your change requires schema modifications:

1. Update the `scripts/supabase-cutover.sql` file with the necessary DDL.
2. Document the migration steps in your PR description.

## Questions?

If you have questions about contributing, open a **Question** issue or reach out to the maintainers.

Thank you for helping improve the BOOM House bot!