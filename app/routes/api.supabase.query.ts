import { type ActionFunctionArgs } from '@remix-run/cloudflare';
import { createScopedLogger } from '~/utils/logger';
import { supabaseConnection } from '~/lib/stores/supabase';

const logger = createScopedLogger('api.supabase.query');

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const { projectId, query } = (await request.json()) as any;
    logger.info('=== SQL 执行开始 ===');
    logger.info('项目ID:', projectId);
    logger.info('SQL查询:', query);

    if (!projectId || !query) {
      logger.error('缺少必要参数:', { projectId: !!projectId, query: !!query });
      return new Response('Missing projectId or query', { status: 400 });
    }

    // 从 store 中获取 Supabase 连接信息
    const connection = supabaseConnection.get();
    logger.info('Store 连接状态:', {
      user: !!connection.user,
      selectedProjectId: connection.selectedProjectId,
      isConnected: connection.isConnected,
      hasCredentials: !!connection.credentials,
      project: connection.project?.id,
    });

    const credentials = connection.credentials || {};
    logger.info('Credentials 详情:', {
      hasSupabaseUrl: !!credentials.supabaseUrl,
      hasServiceRoleKey: !!credentials.serviceRoleKey,
      supabaseUrlLength: credentials.supabaseUrl?.length || 0,
      serviceRoleKeyLength: credentials.serviceRoleKey?.length || 0,
    });

    const supabaseUrl = credentials.supabaseUrl;
    const serviceRoleKey = credentials.serviceRoleKey;

    logger.info('连接信息检查:');
    logger.info('- supabaseUrl:', supabaseUrl ? '已设置' : '未设置');
    logger.info('- serviceRoleKey:', serviceRoleKey ? '已设置' : '未设置');

    if (!supabaseUrl || !serviceRoleKey) {
      logger.error('缺少连接凭证:', { supabaseUrl: !!supabaseUrl, serviceRoleKey: !!serviceRoleKey });
      logger.error('请确保已选择项目并获取了 API Keys');

      return new Response('Missing supabaseUrl or serviceRoleKey', { status: 400 });
    }

    logger.info('准备调用 Supabase API:');
    logger.info('- URL:', `${supabaseUrl}/pg/query`);
    logger.info('- Method: POST');
    logger.info('- Headers: apikey, Content-Type: application/json');

    // 使用 Supabase HTTP SQL API 执行查询
    const response = await fetch(`${supabaseUrl}/pg/query`, {
      method: 'POST',
      headers: {
        apikey: serviceRoleKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    });

    logger.info('Supabase API 响应状态:', response.status, response.statusText);

    const rawText = await response.text();
    logger.info('Supabase API 原始响应:', rawText);

    let result;

    try {
      result = JSON.parse(rawText);
      logger.info('SQL 执行成功!');
      logger.info('执行结果:', JSON.stringify(result, null, 2));
    } catch (e) {
      logger.error('Supabase API 返回非 JSON 响应:', rawText);
      logger.error('JSON 解析错误:', e);

      return new Response(
        JSON.stringify({
          error: {
            message: rawText,
          },
        }),
        {
          status: response.status,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );
    }

    logger.info('=== SQL 执行完成 ===');

    return new Response(JSON.stringify(result), {
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    logger.error('=== SQL 执行失败 ===');
    logger.error('错误类型:', error instanceof Error ? error.constructor.name : typeof error);
    logger.error('错误消息:', error instanceof Error ? error.message : String(error));

    if (error instanceof Error && error.stack) {
      logger.error('错误堆栈:', error.stack);
    }

    return new Response(
      JSON.stringify({
        error: {
          message: error instanceof Error ? error.message : 'Query execution failed',
          stack: error instanceof Error ? error.stack : undefined,
        },
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );
  }
}
