import { AnimatePresence, motion } from 'framer-motion';
import type { SupabaseAlert } from '~/types/actions';
import { classNames } from '~/utils/classNames';
import { supabaseConnection } from '~/lib/stores/supabase';
import { useStore } from '@nanostores/react';
import { useState, useEffect } from 'react';

interface Props {
  alert: SupabaseAlert;
  clearAlert: () => void;
  postMessage: (message: string) => void;
}

export function SupabaseChatAlert({ alert, clearAlert, postMessage }: Props) {
  const { content } = alert;
  const connection = useStore(supabaseConnection);
  const [isExecuting, setIsExecuting] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [hasAutoExecuted, setHasAutoExecuted] = useState(false);

  // Determine connection state - 放宽条件，只要有项目选择和 API Keys 就认为已连接
  const isConnected = !!(
    connection.selectedProjectId &&
    connection.credentials?.supabaseUrl &&
    connection.credentials?.serviceRoleKey
  );

  // Debug connection state
  console.log('SupabaseAlert 连接状态调试:', {
    user: !!connection.user,
    selectedProjectId: connection.selectedProjectId,
    hasCredentials: !!connection.credentials,
    supabaseUrl: !!connection.credentials?.supabaseUrl,
    serviceRoleKey: !!connection.credentials?.serviceRoleKey,
    isConnected,
    credentials: connection.credentials,
    fullConnection: connection,
  });

  // Reset auto-execution state when content changes
  useEffect(() => {
    setHasAutoExecuted(false);
  }, [content]);

  // Auto-execute SQL when connection is established
  useEffect(() => {
    if (isConnected && !hasAutoExecuted && content) {
      console.log('连接建立，自动执行 SQL');
      setHasAutoExecuted(true);
      executeSupabaseAction(content);
    }
  }, [isConnected, hasAutoExecuted, content]);

  // Set title and description based on connection state
  const title = isConnected ? 'Supabase Query' : 'Supabase Connection Required';
  const description = isConnected ? 'Execute database query' : 'Supabase connection required';
  const message = isConnected
    ? hasAutoExecuted
      ? 'SQL is being executed automatically...'
      : 'Please review the proposed changes and apply them to your database.'
    : 'Please connect to Supabase to continue with this operation.';

  const handleConnectClick = () => {
    // Dispatch an event to open the Supabase connection dialog
    document.dispatchEvent(new CustomEvent('open-supabase-connection'));
  };

  // Determine if we should show the Connect button or Apply Changes button
  const showConnectButton = !isConnected;
  const showApplyButton = isConnected && !hasAutoExecuted;

  const executeSupabaseAction = async (sql: string) => {
    if (!connection.selectedProjectId) {
      console.error('No Supabase project selected');
      return;
    }

    if (!connection.credentials?.supabaseUrl || !connection.credentials?.serviceRoleKey) {
      console.error('Missing Supabase credentials. Please ensure API keys are fetched.');
      postMessage(
        `*Error: Missing Supabase credentials. Please connect to Supabase and select a project with valid API keys.*\n`,
      );

      return;
    }

    setIsExecuting(true);

    try {
      const response = await fetch('/api/supabase/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: sql,
          projectId: connection.selectedProjectId,
        }),
      });

      if (!response.ok) {
        const errorData = (await response.json()) as any;
        throw new Error(`Supabase query failed: ${errorData.error?.message || response.statusText}`);
      }

      const result = await response.json();
      console.log('Supabase query executed successfully:', result);
      clearAlert();
    } catch (error) {
      console.error('Failed to execute Supabase action:', error);
      postMessage(
        `*Error executing Supabase query please fix and return the query again*\n\`\`\`\n${error instanceof Error ? error.message : String(error)}\n\`\`\`\n`,
      );
    } finally {
      setIsExecuting(false);
    }
  };

  const cleanSqlContent = (content: string) => {
    if (!content) {
      return '';
    }

    let cleaned = content.replace(/\/\*[\s\S]*?\*\//g, '');

    cleaned = cleaned.replace(/(--).*$/gm, '').replace(/(#).*$/gm, '');

    const statements = cleaned
      .split(';')
      .map((stmt) => stmt.trim())
      .filter((stmt) => stmt.length > 0)
      .join(';\n\n');

    return statements;
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
        className="max-w-chat rounded-lg border-l-2 border-l-[#098F5F] border border-bolt-elements-borderColor bg-bolt-elements-background-depth-2"
      >
        {/* Header */}
        <div className="p-4 pb-2">
          <div className="flex items-center gap-2">
            <img height="10" width="18" crossOrigin="anonymous" src="https://cdn.simpleicons.org/supabase" />
            <h3 className="text-sm font-medium text-[#3DCB8F]">{title}</h3>
          </div>
        </div>

        {/* SQL Content */}
        <div className="px-4">
          {!isConnected ? (
            <div className="p-3 rounded-md bg-bolt-elements-background-depth-3">
              <span className="text-sm text-bolt-elements-textPrimary">
                You must first connect to Supabase and select a project.
              </span>
            </div>
          ) : (
            <>
              <div
                className="flex items-center p-2 rounded-md bg-bolt-elements-background-depth-3 cursor-pointer"
                onClick={() => setIsCollapsed(!isCollapsed)}
              >
                <div className="i-ph:database text-bolt-elements-textPrimary mr-2"></div>
                <span className="text-sm text-bolt-elements-textPrimary flex-grow">
                  {description || 'Create table and setup auth'}
                </span>
                <div
                  className={`i-ph:caret-up text-bolt-elements-textPrimary transition-transform ${isCollapsed ? 'rotate-180' : ''}`}
                ></div>
              </div>

              {!isCollapsed && content && (
                <div className="mt-2 p-3 bg-bolt-elements-background-depth-4 rounded-md overflow-auto max-h-60 font-mono text-xs text-bolt-elements-textSecondary">
                  <pre>{cleanSqlContent(content)}</pre>
                </div>
              )}
            </>
          )}
        </div>

        {/* Message and Actions */}
        <div className="p-4">
          <p className="text-sm text-bolt-elements-textSecondary mb-4">{message}</p>

          <div className="flex gap-2">
            {showConnectButton ? (
              <button
                onClick={handleConnectClick}
                className={classNames(
                  `px-3 py-2 rounded-md text-sm font-medium`,
                  'bg-[#098F5F]',
                  'hover:bg-[#0aa06c]',
                  'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500',
                  'text-white',
                  'flex items-center gap-1.5',
                )}
              >
                Connect to Supabase
              </button>
            ) : showApplyButton ? (
              <button
                onClick={() => executeSupabaseAction(content)}
                disabled={isExecuting}
                className={classNames(
                  `px-3 py-2 rounded-md text-sm font-medium`,
                  'bg-[#098F5F]',
                  'hover:bg-[#0aa06c]',
                  'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500',
                  'text-white',
                  'flex items-center gap-1.5',
                  isExecuting ? 'opacity-70 cursor-not-allowed' : '',
                )}
              >
                {isExecuting ? 'Applying...' : 'Apply Changes'}
              </button>
            ) : (
              <button
                disabled={isExecuting}
                className={classNames(
                  `px-3 py-2 rounded-md text-sm font-medium`,
                  'bg-[#098F5F]',
                  'opacity-70 cursor-not-allowed',
                  'text-white',
                  'flex items-center gap-1.5',
                )}
              >
                {isExecuting ? 'Executing...' : 'Executed'}
              </button>
            )}
            <button
              onClick={clearAlert}
              disabled={isExecuting}
              className={classNames(
                `px-3 py-2 rounded-md text-sm font-medium`,
                'bg-[#503B26]',
                'hover:bg-[#774f28]',
                'focus:outline-none',
                'text-[#F79007]',
                isExecuting ? 'opacity-70 cursor-not-allowed' : '',
              )}
            >
              Dismiss
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
