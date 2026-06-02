import React from 'react';
import { Handle, Position, NodeProps } from 'reactflow';

interface CustomNodeData {
  label: string;
  icon: string;
  type: string;
  status?: 'idle' | 'running' | 'error';
  error?: string;
}

const CustomNode: React.FC<NodeProps<CustomNodeData>> = ({ data, selected }) => {
  const nodeColors: Record<string, { bg: string; border: string }> = {
    'mqtt-input': { bg: 'bg-blue-50', border: 'border-blue-400' },
    'function': { bg: 'bg-amber-50', border: 'border-amber-400' },
    'aggregate': { bg: 'bg-purple-50', border: 'border-purple-400' },
    'http-output': { bg: 'bg-green-50', border: 'border-green-400' }
  };

  const colors = nodeColors[data.type] || { bg: 'bg-gray-50', border: 'border-gray-400' };

  const statusColors: Record<string, string> = {
    idle: 'bg-gray-400',
    running: 'bg-yellow-400 animate-pulse',
    error: 'bg-red-500'
  };

  return (
    <div
      className={`px-4 py-2 rounded-lg border-2 ${colors.bg} ${colors.border} ${
        selected ? 'ring-2 ring-blue-500 ring-offset-1' : ''
      } shadow-sm min-w-[140px]`}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-gray-400 !border-2 !border-white"
      />
      
      <div className="flex items-center gap-2">
        <div className="relative">
          <span className="text-xl">{data.icon}</span>
          {data.status && (
            <div
              className={`absolute -top-1 -right-1 w-2 h-2 rounded-full ${statusColors[data.status]} border border-white`}
            />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-gray-800 text-sm truncate">{data.label}</div>
          {data.status === 'error' && data.error && (
            <div className="text-xs text-red-500 truncate" title={data.error}>
              {data.error}
            </div>
          )}
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-gray-400 !border-2 !border-white"
      />
    </div>
  );
};

export default CustomNode;
