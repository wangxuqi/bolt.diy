import { type ActionFunctionArgs } from '@remix-run/cloudflare';
import { createScopedLogger } from '~/utils/logger';

const logger = createScopedLogger('api.supabase.query');

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const { projectId, query, supabaseUrl, serviceRoleKey } = (await request.json()) as any;

    if (!projectId || !query || !supabaseUrl || !serviceRoleKey) {
      logger.error('缺少必要参数:', {
        projectId: !!projectId,
        query: !!query,
        supabaseUrl: !!supabaseUrl,
        serviceRoleKey: !!serviceRoleKey,
      });
      return new Response('Missing required parameters: projectId, query, supabaseUrl, or serviceRoleKey', {
        status: 400,
      });
    }

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

    if (!response.ok) {
      const errorText = await response.text();
      let errorData;

      try {
        errorData = JSON.parse(errorText);
      } catch (e) {
        console.log(e);
        errorData = { message: errorText };
      }

      logger.error(
        'Supabase API error:',
        JSON.stringify({
          status: response.status,
          statusText: response.statusText,
          error: errorData,
        }),
      );

      return new Response(
        JSON.stringify({
          error: {
            status: response.status,
            statusText: response.statusText,
            message: errorData.message || errorData.error || errorText,
            details: errorData,
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

    const result = await response.json();

    return new Response(JSON.stringify(result), {
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    logger.error('Query execution error:', error);
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
