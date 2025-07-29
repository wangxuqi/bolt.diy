import { getSystemPrompt } from './prompts/prompts';
import optimized from './prompts/optimized';
import { getChineseFineTunedPrompt } from './prompts/chinese-prompts';
import type { DesignScheme } from '~/types/design-scheme';

export interface PromptOptions {
  cwd: string;
  allowedHtmlElements: string[];
  modificationTagName: string;
  designScheme?: DesignScheme;
  supabase?: {
    isConnected: boolean;
    hasSelectedProject: boolean;
    credentials?: {
      anonKey?: string;
      supabaseUrl?: string;
    };
  };
}

export class PromptLibrary {
  static library: Record<
    string,
    {
      label: string;
      description: string;
      get: (options: PromptOptions) => string;
    }
  > = {
    default: {
      label: 'Default Prompt',
      description: 'An Chinese fine tuned prompt for better results',
      get: (options) => getChineseFineTunedPrompt(options.cwd, options.supabase),
    },
    original: {
      label: 'Old Default Prompt',
      description: 'The OG battle tested default system Prompt',
      get: (options) => getSystemPrompt(options.cwd, options.supabase, options.designScheme),
    },
    optimized: {
      label: 'Optimized Prompt (experimental)',
      description: 'An Experimental version of the prompt for lower token usage',
      get: (options) => optimized(options),
    },
  };
  static getList() {
    return Object.entries(this.library).map(([key, value]) => {
      const { label, description } = value;
      return {
        id: key,
        label,
        description,
      };
    });
  }
  static getPropmtFromLibrary(promptId: string, options: PromptOptions) {
    const prompt = this.library[promptId];

    if (!prompt) {
      throw 'Prompt Now Found';
    }

    return this.library[promptId]?.get(options);
  }
}
