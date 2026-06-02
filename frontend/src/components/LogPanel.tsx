import React, { useEffect, useRef } from 'react';
import { useFlowStore } from '../store/flowStore';

const LogPanel: React.FC = () => {
  const logs = useFlowStore((state) => state.logs);
  const currentFlowId = useFlowStore((state) => state.currentFlowId);
  const loadLogs = useFlowStore((state) => state.loadLogs);
  const logContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (currentFlowId) {
      const interval = setInterval(() => {
        loadLogs(currentFlowId);
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [currentFlowId, loadLogs]);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  const levelColors: Record<string, string> = {
    info: 'text-blue-600 bg-blue-50',
    warn: 'text-amber-600 bg-amber-50',
    error: 'text-red-600 bg-red-50'
  };

  if (!currentFlowId) {
    return null;
  }

  return (
    <div className="h-40 bg-gray-50 border-t border-gray-200 flex flex-col">
      <div className="px-3 py-2 border-b border-gray-200 flex items-center justify-between">
        <h3 className="font-semibold text-gray-700 text-xs">运行日志</h3>
        <span className="text-xs text-gray-500">
          {logs.length} 条记录
        </span>
      </div>
      <div
        ref={logContainerRef}
        className="flex-1 overflow-y-auto p-2 font-mono text-xs"
      >
        {logs.length === 0 ? (
          <div className="text-center py-4 text-gray-400">
            暂无日志
          </div>
        ) : (
          logs.map((log, index) => (
            <div
              key={index}
              className={`py-1 px-2 rounded mb-1 ${levelColors[log.level] || 'text-gray-600 bg-gray-50'}`}
            >
              <span className="text-gray-400 mr-2">
                {new Date(log.timestamp).toLocaleTimeString()}
              </span>
              <span className="font-medium mr-2">[{log.nodeId.slice(0, 8)}]</span>
              <span>{log.message}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default LogPanel;
