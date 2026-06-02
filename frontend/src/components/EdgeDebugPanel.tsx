import React, { useEffect, useRef } from 'react';
import { useFlowStore } from '../store/flowStore';
import { MessageSnapshot } from '../types';

const EdgeDebugPanel: React.FC = () => {
  const selectedEdgeId = useFlowStore((state) => state.selectedEdgeId);
  const currentFlow = useFlowStore((state) => state.getCurrentFlow());
  const edgeSnapshots = useFlowStore((state) => state.edgeSnapshots);
  const debugEnabled = useFlowStore((state) => state.debugEnabled);
  const enableDebug = useFlowStore((state) => state.enableDebug);
  const disableDebug = useFlowStore((state) => state.disableDebug);
  const loadEdgeSnapshots = useFlowStore((state) => state.loadEdgeSnapshots);
  const clearSnapshots = useFlowStore((state) => state.clearSnapshots);
  const setSelectedEdge = useFlowStore((state) => state.setSelectedEdge);
  const executeDryRun = useFlowStore((state) => state.executeDryRun);
  const clearDryRunResult = useFlowStore((state) => state.clearDryRunResult);
  const dryRunResult = useFlowStore((state) => state.dryRunResult);
  const [dryRunPayload, setDryRunPayload] = React.useState('{"temperature": 25.5, "humidity": 60}');
  const [autoRefresh, setAutoRefresh] = React.useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (autoRefresh && selectedEdgeId && debugEnabled) {
      intervalRef.current = setInterval(() => {
        loadEdgeSnapshots(selectedEdgeId);
      }, 1000);
      return () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
      };
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
  }, [autoRefresh, selectedEdgeId, debugEnabled, loadEdgeSnapshots]);

  if (!selectedEdgeId || !currentFlow) return null;

  const edge = currentFlow.edges.find(e => e.id === selectedEdgeId);
  if (!edge) return null;

  const sourceNode = currentFlow.nodes.find(n => n.id === edge.source);
  const targetNode = currentFlow.nodes.find(n => n.id === edge.target);

  const snapshotData = edgeSnapshots.find(s => s.edgeId === selectedEdgeId);
  const samples = snapshotData?.samples ?? [];
  const totalMessages = snapshotData?.totalMessages ?? 0;

  const handleDryRun = () => {
    if (!sourceNode) return;
    try {
      const payload = JSON.parse(dryRunPayload);
      executeDryRun(sourceNode.id, payload);
    } catch {
      executeDryRun(sourceNode.id, dryRunPayload);
    }
  };

  const renderSnapshot = (snapshot: MessageSnapshot, index: number) => {
    const msg = snapshot.message;
    return (
      <div key={index} className="bg-gray-50 rounded p-2 text-xs font-mono border border-gray-100">
        <div className="flex items-center justify-between mb-1">
          <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
            snapshot.direction === 'output' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
          }`}>
            {snapshot.direction === 'output' ? '源输出' : '目标输入'}
          </span>
          <span className="text-gray-400">
            {new Date(snapshot.capturedAt).toLocaleTimeString()}
          </span>
        </div>
        <div className="mt-1">
          <span className="text-gray-500">payload: </span>
          <span className="text-gray-800 break-all">
            {typeof msg.payload === 'object' 
              ? JSON.stringify(msg.payload, null, 2)
              : String(msg.payload)}
          </span>
        </div>
        {msg.topic && (
          <div className="mt-0.5">
            <span className="text-gray-500">topic: </span>
            <span className="text-amber-600">{msg.topic}</span>
          </div>
        )}
        {msg.metadata && Object.keys(msg.metadata).length > 0 && (
          <div className="mt-0.5">
            <span className="text-gray-500">metadata: </span>
            <span className="text-purple-600">{JSON.stringify(msg.metadata)}</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-80 bg-white border-l border-gray-200 flex flex-col h-full shadow-lg">
      <div className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">🔍</span>
            <h2 className="font-semibold text-sm">连线调试</h2>
          </div>
          <button
            onClick={() => setSelectedEdge(null)}
            className="text-white/70 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>
        <div className="mt-2 text-xs text-white/80">
          <span className="font-medium">{sourceNode?.label || edge.source}</span>
          <span className="mx-1">→</span>
          <span className="font-medium">{targetNode?.label || edge.target}</span>
        </div>
      </div>

      <div className="p-3 border-b border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-gray-600">调试模式</span>
          <button
            onClick={debugEnabled ? disableDebug : enableDebug}
            className={`px-3 py-1 text-xs rounded-full font-medium transition-colors ${
              debugEnabled
                ? 'bg-red-100 text-red-700 hover:bg-red-200'
                : 'bg-green-100 text-green-700 hover:bg-green-200'
            }`}
          >
            {debugEnabled ? '● 调试中' : '○ 开启调试'}
          </button>
        </div>

        {debugEnabled && (
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-3 h-3"
              />
              <span className="text-xs text-gray-600">自动刷新</span>
            </label>
            <button
              onClick={() => loadEdgeSnapshots(selectedEdgeId)}
              className="px-2 py-0.5 text-xs text-blue-600 hover:bg-blue-50 rounded"
            >
              ↻ 刷新
            </button>
          </div>
        )}
      </div>

      {debugEnabled && (
        <div className="p-3 border-b border-gray-200">
          <h3 className="text-xs font-semibold text-gray-700 mb-2">⚡ 干运行测试</h3>
          <p className="text-[10px] text-gray-500 mb-2">
            无需部署，注入测试消息到源节点并查看数据流变化
          </p>
          <textarea
            value={dryRunPayload}
            onChange={(e) => setDryRunPayload(e.target.value)}
            className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono h-16 resize-none"
            placeholder="输入测试 JSON 数据"
          />
          <div className="flex gap-2 mt-2">
            <button
              onClick={handleDryRun}
              className="flex-1 px-3 py-1.5 text-xs bg-indigo-500 text-white rounded hover:bg-indigo-600 font-medium"
            >
              ▶ 执行干运行
            </button>
            {dryRunResult && (
              <button
                onClick={clearDryRunResult}
                className="px-2 py-1.5 text-xs text-gray-500 hover:bg-gray-100 rounded"
              >
                清除
              </button>
            )}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-3">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-semibold text-gray-700">
            📊 数据样本
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-gray-500">
              {totalMessages > 0 ? `共 ${totalMessages} 条消息` : '暂无数据'}
            </span>
            {samples.length > 0 && (
              <button
                onClick={clearSnapshots}
                className="text-[10px] text-red-500 hover:text-red-700"
              >
                清除
              </button>
            )}
          </div>
        </div>

        {!debugEnabled ? (
          <div className="text-center py-8">
            <p className="text-sm text-gray-400">开启调试模式后</p>
            <p className="text-sm text-gray-400">此处显示实时数据样本</p>
          </div>
        ) : samples.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-gray-400">等待数据流过...</p>
            <p className="text-xs text-gray-400 mt-1">可使用干运行注入测试数据</p>
          </div>
        ) : (
          <div className="space-y-2">
            {samples.map((sample, index) => renderSnapshot(sample, index))}
          </div>
        )}

        {dryRunResult && dryRunResult.length > 0 && (
          <div className="mt-4">
            <h3 className="text-xs font-semibold text-gray-700 mb-2">
              🧪 干运行结果
            </h3>
            <div className="space-y-2">
              {dryRunResult.map((nodeResult, index) => (
                <div key={index} className="bg-indigo-50 rounded p-2 border border-indigo-100">
                  <div className="text-xs font-semibold text-indigo-700 mb-1">
                    {nodeResult.nodeLabel} ({nodeResult.nodeType})
                  </div>
                  <div className="text-[10px] text-indigo-500 mb-1">
                    输入: {nodeResult.totalInputMessages} | 输出: {nodeResult.totalOutputMessages}
                  </div>
                  {nodeResult.outputSnapshots.length > 0 && (
                    <div className="mt-1">
                      <div className="text-[10px] text-indigo-600 mb-0.5">输出样本:</div>
                      <pre className="text-[10px] font-mono text-indigo-800 bg-white rounded p-1 overflow-x-auto max-h-20">
                        {JSON.stringify(nodeResult.outputSnapshots[0]?.message?.payload, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="p-3 border-t border-gray-200 bg-gray-50">
        <div className="text-[10px] text-gray-500 space-y-0.5">
          <p>💡 提示: 点击连线查看数据样本</p>
          <p>开启调试模式后，数据流经过时自动采样</p>
        </div>
      </div>
    </div>
  );
};

export default EdgeDebugPanel;
