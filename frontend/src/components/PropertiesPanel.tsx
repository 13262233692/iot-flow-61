import React from 'react';
import { useFlowStore } from '../store/flowStore';

const PropertiesPanel: React.FC = () => {
  const currentFlow = useFlowStore((state) => state.getCurrentFlow());
  const selectedNodeId = useFlowStore((state) => state.selectedNodeId);
  const selectedEdgeId = useFlowStore((state) => state.selectedEdgeId);
  const updateNode = useFlowStore((state) => state.updateNode);
  const deleteNode = useFlowStore((state) => state.deleteNode);
  const nodeDefinitions = useFlowStore((state) => state.nodes);

  const selectedNode = currentFlow?.nodes.find((n) => n.id === selectedNodeId);
  const nodeDef = nodeDefinitions.find((n) => n.type === selectedNode?.type);

  if (selectedEdgeId) {
    return null;
  }

  if (!selectedNode || !nodeDef) {
    return (
      <div className="w-72 bg-gray-50 border-l border-gray-200 flex flex-col h-full">
        <div className="p-3 border-b border-gray-200">
          <h2 className="font-semibold text-gray-700 text-sm">属性面板</h2>
        </div>
        <div className="flex-1 flex items-center justify-center p-4">
          <p className="text-sm text-gray-500 text-center">
            选择一个节点以编辑其属性
          </p>
        </div>
      </div>
    );
  }

  const handleConfigChange = (key: string, value: any) => {
    updateNode(selectedNode.id, {
      config: { ...selectedNode.config, [key]: value }
    });
  };

  const handleLabelChange = (label: string) => {
    updateNode(selectedNode.id, { label });
  };

  const renderConfigField = (key: string, value: any) => {
    if (typeof value === 'boolean') {
      return (
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={value}
            onChange={(e) => handleConfigChange(key, e.target.checked)}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm text-gray-700">{key}</span>
        </label>
      );
    }

    if (typeof value === 'object' && value !== null) {
      return (
        <textarea
          value={JSON.stringify(value, null, 2)}
          onChange={(e) => {
            try {
              handleConfigChange(key, JSON.parse(e.target.value));
            } catch {}
          }}
          className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono h-24 resize-none"
        />
      );
    }

    if (key === 'code') {
      return (
        <textarea
          value={value}
          onChange={(e) => handleConfigChange(key, e.target.value)}
          className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono h-40 resize-none"
          spellCheck={false}
        />
      );
    }

    if (value && typeof value === 'string' && value.includes('\n')) {
      return (
        <textarea
          value={value}
          onChange={(e) => handleConfigChange(key, e.target.value)}
          className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono h-20 resize-none"
          spellCheck={false}
        />
      );
    }

    return (
      <input
        type="text"
        value={value}
        onChange={(e) => handleConfigChange(key, e.target.value)}
        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
      />
    );
  };

  return (
    <div className="w-72 bg-gray-50 border-l border-gray-200 flex flex-col h-full">
      <div className="p-3 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <span className="text-lg">{nodeDef.icon}</span>
          <h2 className="font-semibold text-gray-700 text-sm">{nodeDef.label}</h2>
        </div>
        <p className="text-xs text-gray-500 mt-1">{nodeDef.description}</p>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            节点名称
          </label>
          <input
            type="text"
            value={selectedNode.label}
            onChange={(e) => handleLabelChange(e.target.value)}
            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            节点ID
          </label>
          <input
            type="text"
            value={selectedNode.id}
            disabled
            className="w-full px-2 py-1 text-xs border border-gray-200 rounded bg-gray-100 text-gray-500 font-mono"
          />
        </div>

        <div className="border-t border-gray-200 pt-4">
          <h3 className="text-xs font-semibold text-gray-700 mb-3">配置参数</h3>
          <div className="space-y-3">
            {Object.entries(selectedNode.config).map(([key, value]) => (
              <div key={key}>
                <label className="block text-xs font-medium text-gray-600 mb-1 capitalize">
                  {key}
                </label>
                {renderConfigField(key, value)}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="p-3 border-t border-gray-200">
        <button
          onClick={() => deleteNode(selectedNode.id)}
          className="w-full px-3 py-2 text-sm text-red-600 border border-red-300 rounded hover:bg-red-50 transition-colors"
        >
          删除节点
        </button>
      </div>
    </div>
  );
};

export default PropertiesPanel;
