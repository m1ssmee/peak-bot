import 'dotenv/config';
import { anthropic } from '@ai-sdk/anthropic';
import { openai } from '@ai-sdk/openai';
import { google } from '@ai-sdk/google';

const providers = { anthropic, openai, google };

const name = process.env.LLM_PROVIDER;
const id = process.env.LLM_MODEL;
if (!providers[name]) throw new Error(`LLM_PROVIDER must be one of: ${Object.keys(providers).join(', ')} (got "${name}")`);
if (!id) throw new Error('LLM_MODEL is not set');

// The only place in the codebase that names a provider SDK.
export const model = providers[name](id);
