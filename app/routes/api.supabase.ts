import { json, type ActionFunction, type LoaderFunction } from '@remix-run/cloudflare';
import type { SupabaseProject } from '~/types/supabase';
import crypto from 'crypto';

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
    const accessKeyId = process.env.ALIBABA_CLOUD_ACCESS_KEY_ID;
    const accessKeySecret = process.env.ALIBABA_CLOUD_ACCESS_KEY_SECRET;

    if (!accessKeyId || !accessKeySecret) {
      return json(
        { error: '请在 .env 文件中配置 ALIBABA_CLOUD_ACCESS_KEY_ID 和 ALIBABA_CLOUD_ACCESS_KEY_SECRET' },
        { status: 500 },
      );
    }

    // 构造请求参数
    const regionId = process.env.ALIBABA_CLOUD_REGION_ID || 'cn-beijing';
    const params: Record<string, string> = {
      Action: 'ListSupabaseProjects',
      RegionId: regionId,
      Format: 'JSON',
      Version: '2016-05-03',
      SignatureMethod: 'HMAC-SHA1',
      SignatureNonce: String(Date.now()),
      SignatureVersion: '1.0',
      AccessKeyId: accessKeyId,
      Timestamp: new Date().toISOString(),
    };
    params.Signature = getSignature(params, accessKeySecret);

    // 拼接URL
    const query = Object.keys(params)
      .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
      .join('&');
    const url = `https://gpdb.aliyuncs.com/?${query}`;

    // 发送请求
    const resp = await fetch(url, { method: 'GET' });
    const data = (await resp.json()) as any;
    console.log('阿里云API原始返回:', JSON.stringify(data, null, 2));

    if (!resp.ok || data.Code) {
      return json({ error: data.Message || 'Failed to fetch projects' }, { status: 401 });
    }

    const items = data.Items || [];
    console.log('阿里云项目原始数据:', JSON.stringify(items, null, 2));

    const projects: SupabaseProject[] = items.map((item: any) => {
      const project = {
        id: item.ProjectId,
        name: item.ProjectName,
        organization_id: '',
        region: item.RegionId,
        created_at: item.CreateTime,
        status: item.Status,

        // 添加 supabaseUrl 字段，从阿里云返回的数据中获取
        supabaseUrl: item.PublicConnectUrl || item.Endpoint || item.Url || item.SupabaseUrl || '',
      };
      console.log('处理后的项目数据:', JSON.stringify(project, null, 2));

      return project;
    });
    projects.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return json({
      user: { email: 'Connected', role: 'Admin' },
      stats: {
        projects,
        totalProjects: projects.length,
      },
    });
  } catch (error) {
    console.error('Supabase API error:', error);
    return json(
      {
        error: error instanceof Error ? error.message : 'Authentication failed',
      },
      { status: 401 },
    );
  }
};
