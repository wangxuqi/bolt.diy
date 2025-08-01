import { BaseProvider } from '~/lib/modules/llm/base-provider';
import type { ModelInfo } from '~/lib/modules/llm/types';
import type { IProviderSetting } from '~/types/model';
import type { LanguageModelV1 } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';

export default class TongyiProvider extends BaseProvider {
  name = 'Tongyi';
  getApiKeyLink = 'https://bailian.console.aliyun.com';

  config = {
    apiTokenKey: 'TONGYI_API_KEY',
  };

  staticModels: ModelInfo[] = [
    { name: 'qwen3-coder-plus', label: 'qwen3-coder-plus', provider: 'Tongyi', maxTokenAllowed: 8000 },
    {
      name: 'qwen3-coder-plus-2025-07-22',
      label: 'qwen3-coder-plus-2025-07-22',
      provider: 'Tongyi',
      maxTokenAllowed: 8000,
    },
    { name: 'qwen-max-latest', label: 'qwen-max-latest', provider: 'Tongyi', maxTokenAllowed: 8000 },
    { name: 'deepseek-r1', label: 'deepseek-r1', provider: 'Tongyi', maxTokenAllowed: 8000 },
    { name: 'deepseek-v3', label: 'deepseek-v3', provider: 'Tongyi', maxTokenAllowed: 8000 },
    { name: 'qwen-plus-latest', label: 'qwen-plus-latest', provider: 'Tongyi', maxTokenAllowed: 8000 },
    {
      name: 'Moonshot-Kimi-K2-Instruct',
      label: 'Moonshot-Kimi-K2-Instruct',
      provider: 'Tongyi',
      maxTokenAllowed: 8000,
    },
  ];

  async getDynamicModels(
    apiKeys?: Record<string, string>,
    settings?: IProviderSetting,
    serverEnv?: Record<string, string>,
  ): Promise<ModelInfo[]> {
    const { apiKey } = this.getProviderBaseUrlAndKey({
      apiKeys,
      providerSettings: settings,
      serverEnv: serverEnv as any,
      defaultBaseUrlKey: '',
      defaultApiTokenKey: 'TONGYI_API_KEY',
    });

    if (!apiKey) {
      throw `Missing Api Key configuration for ${this.name} provider`;
    }

    const response = await fetch(`https://dashscope.aliyuncs.com/compatible-mode/v1/models`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    const res = (await response.json()) as any;
    const staticModelIds = this.staticModels.map((m) => m.name);

    const data = res.data.filter(
      (model: any) =>
        model.object === 'model' &&
        (model.id.startsWith('Moonshot') || model.id.startsWith('qwen3-coder')) &&
        !staticModelIds.includes(model.id),
    );

    // Sort models by creation date in descending order (newest first)
    const sortedData = data.sort((a: any, b: any) => {
      return b.created - a.created;
    });

    return sortedData.map((m: any) => ({
      name: m.id,
      label: m.id,
      provider: this.name,
      maxTokenAllowed: m.context_window || 32000,
    }));
  }

  getModelInstance(options: {
    model: string;
    serverEnv: Env;
    apiKeys?: Record<string, string>;
    providerSettings?: Record<string, IProviderSetting>;
  }): LanguageModelV1 {
    const { model, serverEnv, apiKeys, providerSettings } = options;

    const { apiKey } = this.getProviderBaseUrlAndKey({
      apiKeys,
      providerSettings: providerSettings?.[this.name],
      serverEnv: serverEnv as any,
      defaultBaseUrlKey: '',
      defaultApiTokenKey: 'TONGYI_API_KEY',
    });

    if (!apiKey) {
      throw new Error(`Missing API key for ${this.name} provider`);
    }

    const tongyi = createOpenAI({
      baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
      apiKey,
    });

    return tongyi(model);
  }
}
