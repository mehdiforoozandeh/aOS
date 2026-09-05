/* Print the agent's system prompt, generated from the registry itself.
 *   npx tsx scripts-prompt.mjs
 * The prompt and the validator read the same registry, so they cannot drift.
 */
import { createRegistry } from './src/registry.ts'
import { systemPrompt } from './src/prompt.ts'
console.log(systemPrompt(createRegistry()))
