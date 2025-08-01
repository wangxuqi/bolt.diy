import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { useStore } from '@nanostores/react';
import { logStore } from '~/lib/stores/logs';
import {
  supabaseConnection,
  isConnecting,
  isFetchingStats,
  isFetchingApiKeys,
  updateSupabaseConnection,
  fetchProjectApiKeys,
} from '~/lib/stores/supabase';

export function useSupabaseConnection() {
  const connection = useStore(supabaseConnection);
  const connecting = useStore(isConnecting);
  const fetchingStats = useStore(isFetchingStats);
  const fetchingApiKeys = useStore(isFetchingApiKeys);
  const [isProjectsExpanded, setIsProjectsExpanded] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  useEffect(() => {
    const savedConnection = localStorage.getItem('supabase_connection');
    const savedCredentials = localStorage.getItem('supabaseCredentials');

    if (savedConnection) {
      const parsed = JSON.parse(savedConnection);

      if (savedCredentials && !parsed.credentials) {
        parsed.credentials = JSON.parse(savedCredentials);
      }

      updateSupabaseConnection(parsed);

      if (parsed.selectedProjectId && !parsed.credentials) {
        fetchProjectApiKeys(parsed.selectedProjectId).catch(console.error);
      }
    }
  }, []);

  const handleConnect = async () => {
    isConnecting.set(true);

    try {
      const response = await fetch('/api/supabase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(''),
      });

      const data = (await response.json()) as any;

      if (!response.ok) {
        throw new Error(data.error || 'Failed to connect');
      }

      updateSupabaseConnection({
        user: data.user,
        stats: data.stats,
      });

      toast.success('Successfully connected to Supabase');

      setIsProjectsExpanded(true);

      return true;
    } catch (error) {
      console.error('Connection error:', error);
      logStore.logError('Failed to authenticate with Supabase', { error });
      toast.error(error instanceof Error ? error.message : 'Failed to connect to Supabase');
      updateSupabaseConnection({ user: null, token: '' });

      return false;
    } finally {
      isConnecting.set(false);
    }
  };

  const handleDisconnect = () => {
    updateSupabaseConnection({ user: null, token: '' });
    toast.success('Disconnected from Supabase');
    setIsDropdownOpen(false);
  };

  const selectProject = async (projectId: string) => {
    const currentState = supabaseConnection.get();
    let projectData = undefined;

    if (projectId && currentState.stats?.projects) {
      projectData = currentState.stats.projects.find((project) => project.id === projectId);
      console.log('找到项目数据:', JSON.stringify(projectData, null, 2));
    }

    updateSupabaseConnection({
      selectedProjectId: projectId,
      project: projectData,
    });

    // 自动获取 API Keys
    if (projectId) {
      try {
        console.log('开始自动获取项目 API Keys:', projectId);

        const result = await fetchProjectApiKeys(projectId);
        console.log('API Keys 获取结果:', JSON.stringify(result, null, 2));
        toast.success('Project selected and API keys fetched successfully');
      } catch (error) {
        console.error('Failed to fetch API keys:', error);
        toast.error('Selected project but failed to fetch API keys');
      }
    } else {
      toast.success('Project selected successfully');
    }

    setIsDropdownOpen(false);
  };

  const handleCreateProject = async () => {
    const regionId = import.meta.env.ALIBABA_CLOUD_REGION_ID || 'cn-beijing';
    window.open(`https://gpdbnext.console.aliyun.com/gpdb/${regionId}/supabase`, '_blank');
  };

  return {
    connection,
    connecting,
    fetchingStats,
    fetchingApiKeys,
    isProjectsExpanded,
    setIsProjectsExpanded,
    isDropdownOpen,
    setIsDropdownOpen,
    handleConnect,
    handleDisconnect,
    selectProject,
    handleCreateProject,
    updateToken: (payload: { accessKey?: string; accessSecret?: string }) => {
      updateSupabaseConnection({
        ...connection,
        ...payload,
      });
    },
    isConnected: !!(connection.user && connection.selectedProjectId),
    fetchProjectApiKeys: (projectId: string) => {
      return fetchProjectApiKeys(projectId);
    },
  };
}
