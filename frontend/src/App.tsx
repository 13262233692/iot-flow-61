import React, { useEffect } from 'react';
import { useFlowStore } from './store/flowStore';
import FlowList from './components/FlowList';
import NodePalette from './components/NodePalette';
import FlowCanvas from './components/FlowCanvas';
import PropertiesPanel from './components/PropertiesPanel';
import EdgeDebugPanel from './components/EdgeDebugPanel';
import LogPanel from './components/LogPanel';
import Toast from './components/Toast';

const App: React.FC = () => {
  const loadNodes = useFlowStore((state) => state.loadNodes);
  const loadFlows = useFlowStore((state) => state.loadFlows);
  const flows = useFlowStore((state) => state.flows);
  const setCurrentFlow = useFlowStore((state) => state.setCurrentFlow);
  const currentFlow = useFlowStore((state) => state.getCurrentFlow());
  const selectedEdgeId = useFlowStore((state) => state.selectedEdgeId);

  useEffect(() => {
    const init = async () => {
      await loadNodes();
      await loadFlows();
    };
    init();
  }, [loadNodes, loadFlows]);

  useEffect(() => {
    if (flows.length > 0 && !currentFlow) {
      setCurrentFlow(flows[0].id);
    }
  }, [flows, currentFlow, setCurrentFlow]);

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      <Toast />
      <header className="h-12 bg-white border-b border-gray-200 flex items-center px-4 gap-4">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🔄</span>
          <h1 className="font-bold text-gray-800">IoT Flow Designer</h1>
        </div>
        <div className="h-6 w-px bg-gray-300"></div>
        <span className="text-sm text-gray-500">低代码物联网数据流设计器</span>
        <div className="flex-1"></div>
        {currentFlow && (
          <div className="text-sm text-gray-600">
            当前: <span className="font-medium">{currentFlow.name}</span>
          </div>
        )}
      </header>

      <div className="flex-1 flex overflow-hidden">
        <FlowList />
        <NodePalette />
        <div className="flex-1 flex flex-col overflow-hidden">
          <FlowCanvas />
          <LogPanel />
        </div>
        {selectedEdgeId ? <EdgeDebugPanel /> : <PropertiesPanel />}
      </div>
    </div>
  );
};

export default App;
