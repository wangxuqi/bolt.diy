import { atom } from 'nanostores';
import type { SupabaseUser, SupabaseStats, SupabaseCredentials } from '~/types/supabase';

export interface SupabaseProject {
  id: string;
  name: string;
  region: string;
  organization_id: string;
  status: string;
  supabaseUrl?: string; // 添加 supabaseUrl 字段
  database?: {
    host: string;
    version: string;
    postgres_engine: string;
    release_channel: string;
  };
  created_at: string;
}

export interface SupabaseConnectionState {
  user: SupabaseUser | null;
  token: string;
  stats?: SupabaseStats;
  selectedProjectId?: string;
  isConnected?: boolean;
  project?: SupabaseProject;
  credentials?: SupabaseCredentials;
}

const savedConnection = typeof localStorage !== 'undefined' ? localStorage.getItem('supabase_connection') : null;
const savedCredentials = typeof localStorage !== 'undefined' ? localStorage.getItem('supabaseCredentials') : null;

const initialState: SupabaseConnectionState = savedConnection
  ? JSON.parse(savedConnection)
  : {
      user: null,
      token: '',
      stats: undefined,
      selectedProjectId: undefined,
      isConnected: false,
      project: undefined,
    };

if (savedCredentials && !initialState.credentials) {
  try {
    initialState.credentials = JSON.parse(savedCredentials);
  } catch (e) {
    console.error('Failed to parse saved credentials:', e);
  }
}

export const isConnecting = atom(false);
export const isFetchingStats = atom(false);
export const isFetchingApiKeys = atom(false);

export const supabaseConnection = atom<SupabaseConnectionState>(initialState);

if (!initialState.stats) {
  fetchSupabaseStats().catch(console.error);
}

export function updateSupabaseConnection(connection: Partial<SupabaseConnectionState>) {
  const currentState = supabaseConnection.get();

  // Update isConnected when user, token, or selectedProjectId changes
  if (connection.user !== undefined || connection.selectedProjectId !== undefined) {
    const newUser = connection.user !== undefined ? connection.user : currentState.user;
    const newSelectedProjectId =
      connection.selectedProjectId !== undefined ? connection.selectedProjectId : currentState.selectedProjectId;
    connection.isConnected = !!(newUser && newSelectedProjectId);
  }

  if (connection.selectedProjectId !== undefined) {
    if (connection.selectedProjectId && currentState.stats?.projects) {
      const selectedProject = currentState.stats.projects.find(
        (project) => project.id === connection.selectedProjectId,
      );

      if (selectedProject) {
        connection.project = selectedProject;
      } else {
        connection.project = {
          id: connection.selectedProjectId,
          name: `Project ${connection.selectedProjectId.substring(0, 8)}...`,
          region: 'unknown',
          organization_id: '',
          status: 'active',
          created_at: new Date().toISOString(),
        };
      }
    } else if (connection.selectedProjectId === '') {
      connection.project = undefined;
      connection.credentials = undefined;
    }
  }

  const newState = { ...currentState, ...connection };
  console.log('更新后的状态:', JSON.stringify(newState, null, 2));
  supabaseConnection.set(newState);

  /*
   * Always save the connection state to localStorage to persist across chats
   */
  if (
    connection.user ||
    connection.token ||
    connection.selectedProjectId !== undefined ||
    connection.credentials !== undefined
  ) {
    localStorage.setItem('supabase_connection', JSON.stringify(newState));

    if (newState.credentials) {
      localStorage.setItem('supabaseCredentials', JSON.stringify(newState.credentials));
    } else {
      localStorage.removeItem('supabaseCredentials');
    }
  } else {
    localStorage.removeItem('supabase_connection');
    localStorage.removeItem('supabaseCredentials');
  }
}

export async function fetchSupabaseStats() {
  isFetchingStats.set(true);

  try {
    // Use the internal API route instead of direct Supabase API call
    const response = await fetch('/api/supabase', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(''),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch projects');
    }

    const data = (await response.json()) as any;

    updateSupabaseConnection({
      user: data.user,
      stats: data.stats,
    });
  } catch (error) {
    console.error('Failed to fetch Supabase stats:', error);
    throw error;
  } finally {
    isFetchingStats.set(false);
  }
}

export async function fetchProjectApiKeys(projectId: string) {
  isFetchingApiKeys.set(true);

  try {
    // 1. 从项目数据中获取 supabaseUrl
    const currentState = supabaseConnection.get();
    console.log('当前连接状态:', JSON.stringify(currentState, null, 2));

    const project = currentState.stats?.projects?.find((p) => p.id === projectId);
    console.log('找到的项目:', JSON.stringify(project, null, 2));

    // 确保 URL 有正确的前缀
    const rawUrl = project?.supabaseUrl || '';
    const supabaseUrl = rawUrl && !rawUrl.startsWith('http') ? `http://${rawUrl}` : rawUrl;
    console.log('提取的 supabaseUrl:', supabaseUrl);

    if (!supabaseUrl) {
      console.warn('项目数据中没有找到 supabaseUrl，请检查阿里云 API 返回的数据结构');
    }

    // 2. 调用后端接口获取API Keys
    console.log('调用 /api/supabase/apikeys 接口...');

    const response = await fetch('/api/supabase/variables', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ projectId }),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch project API keys');
    }

    const data = (await response.json()) as any;
    console.log('API Keys 接口返回:', JSON.stringify(data, null, 2));

    const anonKey = data.anonKey;
    const serviceRoleKey = data.serviceRoleKey;

    console.log('准备更新连接状态，credentials:', {
      anonKey: !!anonKey,
      serviceRoleKey: !!serviceRoleKey,
      supabaseUrl: !!supabaseUrl,
    });

    updateSupabaseConnection({
      credentials: {
        anonKey,
        serviceRoleKey,
        supabaseUrl,
      },
    });

    console.log('=== fetchProjectApiKeys 完成 ===');

    return { anonKey, serviceRoleKey, supabaseUrl };
  } catch (error) {
    console.error('Failed to fetch project API keys:', error);
    throw error;
  } finally {
    isFetchingApiKeys.set(false);
  }
}
