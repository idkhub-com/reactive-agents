# Contributing to IDK

Thank you for your interest in improving **IDK**!

## Setup
1. Install the [Supabase CLI](https://supabase.com/docs/guides/cli).
2. Start the local services:
   ```sh
   supabase start
   ```
3. Install dependencies:
   ```sh
   pnpm install
   ```
4. Run the development server:
   ```sh
   pnpm dev
   ```

## Code Style & Quality
- Lint and format with [Biome](https://biomejs.dev/):
  ```sh
  pnpm check
  # automatically fix issues
  pnpm check:fix
  ```
- Type-check and run tests before pushing:
  ```sh
  pnpm typecheck
  pnpm test
  ```

## Pull Requests
- Create a feature branch for your work.
- Use [conventional commits](https://www.conventionalcommits.org/) for your messages (e.g., `docs: improve contributing guide`).
- Ensure your changes include tests and documentation when appropriate.
- Describe the problem and solution clearly in your pull request.

We appreciate your contributions! 💖
