import { json, type ActionFunction, type LoaderFunction } from '@remix-run/cloudflare';
import crypto from 'crypto';

// 阿里云API响应类型定义
interface AlibabaCloudApiResponse {
  Code?: string;
  Message?: string;
  ApiKeys?: Array<{
    Name: string;
    ApiKey: string;
  }>;
}

// 阿里云签名算法工具函数
function percentEncode(str: string) {
  return encodeURIComponent(str)
    .replace(/\!/g, '%21')
    .replace(/\*/g, '%2A')
    .replace(/\'/g, '%27')
    .replace(/\(/g, '%28')
    .replace(/\)/g, '%29');
}

function getSignature(params: Record<string, string>, accessKeySecret: string) {
  const sortedKeys = Object.keys(params).sort();
  const canonicalizedQueryString = sortedKeys
    .map((key) => `${percentEncode(key)}=${percentEncode(params[key])}`)
    .join('&');
  const stringToSign = `GET&%2F&${percentEncode(canonicalizedQueryString)}`;
  const hmac = crypto.createHmac('sha1', accessKeySecret + '&');
  hmac.update(stringToSign);

  return hmac.digest('base64');
}

export const loader: LoaderFunction = async () => {
  return json({ error: 'Method not allowed' }, { status: 405 });
};

export const action: ActionFunction = async ({ request }) => {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const { projectId } = (await request.json()) as { projectId: string };
    const accessKeyId = process.env.ALIBABA_CLOUD_ACCESS_KEY_ID;
    const accessKeySecret = process.env.ALIBABA_CLOUD_ACCESS_KEY_SECRET;

    // Validate access key format
    if (accessKeyId && accessKeyId.includes('export')) {
      console.error('AccessKeyId 包含 "export"，可能是环境变量设置错误:', accessKeyId);
      return json(
        {
          error: 'ALIBABA_CLOUD_ACCESS_KEY_ID 环境变量设置错误，请检查是否包含了 export 命令',
        },
        { status: 500 },
      );
    }

    if (!accessKeyId || !accessKeySecret) {
      console.error('缺少必要的环境变量');
      return json(
        {
          error: '请在 .env 文件中配置 ALIBABA_CLOUD_ACCESS_KEY_ID 和 ALIBABA_CLOUD_ACCESS_KEY_SECRET',
        },
        { status: 500 },
      );
    }

    if (!projectId) {
      return json({ error: '缺少 projectId' }, { status: 400 });
    }

    // 构造请求参数
    const regionId = process.env.ALIBABA_CLOUD_REGION_ID || 'cn-beijing';
    const params: Record<string, string> = {
      Action: 'GetSupabaseProjectApiKeys',
      RegionId: regionId,
      Format: 'JSON',
      Version: '2016-05-03',
      SignatureMethod: 'HMAC-SHA1',
      SignatureNonce: String(Date.now()),
      SignatureVersion: '1.0',
      AccessKeyId: accessKeyId,
      Timestamp: new Date().toISOString(),
      ProjectId: projectId,
    };

    // 计算签名
    params.Signature = getSignature(params, accessKeySecret);

    // 拼接URL
    const query = Object.keys(params)
      .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
      .join('&');
    const url = `https://gpdb.aliyuncs.com/?${query}`;

    console.log('调用阿里云API获取项目API Keys:', { projectId, regionId, url });

    // 发送请求
    const resp = await fetch(url, { method: 'GET' });

    // 先检查HTTP状态码
    if (!resp.ok) {
      console.error('阿里云API HTTP错误:', resp.status, resp.statusText);
      return json(
        {
          error: `HTTP ${resp.status}: ${resp.statusText}`,
        },
        { status: resp.status },
      );
    }

    // 尝试解析JSON响应
    let data: AlibabaCloudApiResponse;

    try {
      data = (await resp.json()) as AlibabaCloudApiResponse;
    } catch (parseError) {
      console.error('解析阿里云API响应失败:', parseError);

      const textResponse = await resp.text();
      console.error('原始响应内容:', textResponse);

      return json(
        {
          error: '解析API响应失败',
        },
        { status: 500 },
      );
    }

    console.log('GetSupabaseProjectApiKeys 阿里云API原始返回:', JSON.stringify(data, null, 2));

    // 检查阿里云API业务错误
    if (data.Code) {
      console.error('阿里云API业务错误:', data.Code, data.Message);
      return json(
        {
          error: data.Message || `API错误: ${data.Code}`,
        },
        { status: 400 },
      );
    }

    // 解析ApiKeys
    const apiKeys = data.ApiKeys || [];
    const anonKeyObj = apiKeys.find((k) => k.Name === 'anonKey');
    const serviceRoleKeyObj = apiKeys.find((k) => k.Name === 'serviceRoleKey');

    const result = {
      anonKey: anonKeyObj?.ApiKey || '',
      serviceRoleKey: serviceRoleKeyObj?.ApiKey || '',
    };

    console.log('解析到的API Keys:', {
      hasAnonKey: !!result.anonKey,
      hasServiceRoleKey: !!result.serviceRoleKey,
      anonKeyLength: result.anonKey.length,
      serviceRoleKeyLength: result.serviceRoleKey.length,
    });

    return json(result);
  } catch (error) {
    console.error('GetSupabaseProjectApiKeys API error:', error);
    return json(
      {
        error: error instanceof Error ? error.message : 'API key fetch failed',
      },
      { status: 500 },
    );
  }
};
