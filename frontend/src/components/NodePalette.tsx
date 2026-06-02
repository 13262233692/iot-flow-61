import React from 'react';
import { NodeDefinition } from '../types';
import { useFlowStore } from '../store/flowStore';

const NodePalette: React.FC = () => {
  const nodes = useFlowStore((state) => state.nodes);

  const groupedNodes = nodes.reduce((acc, node) => {
    if (!acc[node.category]) {
      acc[node.category] = [];
    }
    acc[node.category].push(node);
    return acc;
  }, {} as Record<string, NodeDefinition[]>);

  const onDragStart = (event: React.DragEvent, nodeType: NodeDefinition) => {
    event.dataTransfer.setData('application/reactflow', JSON.stringify(nodeType));
    event.dataTransfer.effectAllowed = 'move';
  };

  const categoryColors: Record<string, string> = {
    '输入': 'bg-blue-500',
    '处理': 'bg-amber-500',
    '输出': 'bg-green-500'
  };

  return (
    <div className="w-60 bg-gray-50 border-r border-gray-200 flex flex-col h-full">
      <div className="p-3 border-b border-gray-200">
        <h2 className="font-semibold text-gray-700 text-sm">节点面板</h2>
        <p className="text-xs text-gray-500 mt-1">拖拽节点到画布</p>
      </div>
      
      <div className="flex-1 overflow-y-auto p-3">
        {Object.entries(groupedNodes).map(([category, categoryNodes]) => (
          <div key={category} className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-2 h-2 rounded-full ${categoryColors[category] || 'bg-gray-500'}`}></div>
              <h3 className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                {category}
              </h3>
            </div>
            <div className="space-y-2">
              {categoryNodes.map((node) => (
                <div
                  key={node.type}
                  className="bg-white border border-gray-200 rounded-md p-2 cursor-grab hover:shadow-md hover:border-gray-300 transition-all duration-150"
                  draggable
                  onDragStart={(e) => onDragStart(e, node)}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{node.icon || '📦'}</span>
                    <span className="text-sm font-medium text-gray-700">{node.label}</span>
                  </div>
                  {node.description && (
                    <p className="text-xs text-gray-500 mt-1 ml-7">{node.description}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default NodePalette;
