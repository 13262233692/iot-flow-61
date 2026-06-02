import React, { useState } from 'react';
import { useFlowStore } from '../store/flowStore';

const FlowList: React.FC = () => {
  const flows = useFlowStore((state) => state.flows);
  const currentFlowId = useFlowStore((state) => state.currentFlowId);
  const flowStatus = useFlowStore((state) => state.flowStatus);
  const setCurrentFlow = useFlowStore((state) => state.setCurrentFlow);
  const createFlow = useFlowStore((state) => state.createFlow);
  const deleteFlow = useFlowStore((state) => state.deleteFlow);
  const startFlow = useFlowStore((state) => state.startFlow);
  const stopFlow = useFlowStore((state) => state.stopFlow);
  const updateCurrentFlow = useFlowStore((state) => state.updateCurrentFlow);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newFlowName, setNewFlowName] = useState('');
  const [newFlowDesc, setNewFlowDesc] = useState('');

  const handleCreateFlow = async () => {
    if (!newFlowName.trim()) return;

    const newFlow = await createFlow({
      name: newFlowName,
      description: newFlowDesc,
      nodes: [],
      edges: []
    });

    setCurrentFlow(newFlow.id);
    setShowCreateModal(false);
    setNewFlowName('');
    setNewFlowDesc('');
  };

  const handleSaveFlow = () => {
    const currentFlow = useFlowStore.getState().getCurrentFlow();
    if (currentFlow) {
      updateCurrentFlow({
        nodes: currentFlow.nodes,
        edges: currentFlow.edges
      });
    }
  };

  return (
    <div className="w-60 bg-gray-50 border-r border-gray-200 flex flex-col h-full">
      <div className="p-3 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-700 text-sm">数据流</h2>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            + 新建
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {flows.map((flow) => (
          <div
            key={flow.id}
            onClick={() => setCurrentFlow(flow.id)}
            className={`p-2 rounded cursor-pointer transition-colors ${
              currentFlowId === flow.id
                ? 'bg-blue-100 border border-blue-300'
                : 'hover:bg-gray-100 border border-transparent'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700 truncate flex-1">
                {flow.name}
              </span>
              <div
                className={`w-2 h-2 rounded-full ml-2 ${
                  flowStatus?.flowId === flow.id && flowStatus.running
                    ? 'bg-green-500'
                    : 'bg-gray-300'
                }`}
              />
            </div>
            {flow.description && (
              <p className="text-xs text-gray-500 mt-1 truncate">
                {flow.description}
              </p>
            )}
            
            {currentFlowId === flow.id && (
              <div className="flex gap-1 mt-2">
                {flowStatus?.flowId === flow.id && flowStatus.running ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      stopFlow(flow.id);
                    }}
                    className="flex-1 px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600"
                  >
                    停止
                  </button>
                ) : (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      startFlow(flow.id);
                    }}
                    className="flex-1 px-2 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600"
                  >
                    运行
                  </button>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSaveFlow();
                  }}
                  className="flex-1 px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  保存
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm('确定要删除这个数据流吗？')) {
                      deleteFlow(flow.id);
                    }
                  }}
                  className="px-2 py-1 text-xs text-red-500 hover:bg-red-50 rounded"
                >
                  🗑
                </button>
              </div>
            )}
          </div>
        ))}

        {flows.length === 0 && (
          <div className="text-center py-8">
            <p className="text-sm text-gray-500">暂无数据流</p>
            <p className="text-xs text-gray-400 mt-1">点击上方按钮创建</p>
          </div>
        )}
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              创建新数据流
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  名称
                </label>
                <input
                  type="text"
                  value={newFlowName}
                  onChange={(e) => setNewFlowName(e.target.value)}
                  placeholder="输入数据流名称"
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  描述
                </label>
                <textarea
                  value={newFlowDesc}
                  onChange={(e) => setNewFlowDesc(e.target.value)}
                  placeholder="输入数据流描述（可选）"
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 h-20 resize-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded"
              >
                取消
              </button>
              <button
                onClick={handleCreateFlow}
                disabled={!newFlowName.trim()}
                className="px-4 py-2 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                创建
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FlowList;
