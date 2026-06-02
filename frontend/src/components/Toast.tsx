import React, { useEffect } from 'react';
import { useFlowStore } from '../store/flowStore';

const Toast: React.FC = () => {
  const cycleError = useFlowStore((state) => state.cycleError);
  const clearCycleError = useFlowStore((state) => state.clearCycleError);

  useEffect(() => {
    if (cycleError) {
      const timer = setTimeout(() => {
        clearCycleError();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [cycleError, clearCycleError]);

  if (!cycleError) return null;

  return (
    <div className="fixed top-4 right-4 z-50 max-w-md animate-in slide-in-from-right-5 fade-in duration-300">
      <div className="bg-red-50 border border-red-300 rounded-lg shadow-lg overflow-hidden">
        <div className="bg-red-500 text-white px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">⚠️</span>
            <span className="font-semibold">循环依赖错误</span>
          </div>
          <button
            onClick={clearCycleError}
            className="text-white hover:text-red-100 transition-colors"
          >
            ✕
          </button>
        </div>
        <div className="p-4">
          <p className="text-red-700 text-sm mb-3">{cycleError.message}</p>
          {cycleError.cyclePath && cycleError.cyclePath.length > 0 && (
            <div className="mt-3">
              <p className="text-xs text-red-600 mb-2 font-medium">检测到的循环路径：</p>
              <div className="flex flex-wrap items-center gap-1">
                {cycleError.cyclePath.map((nodeId, index) => (
                  <React.Fragment key={index}>
                    <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded font-mono">
                      {nodeId.slice(0, 8)}
                    </span>
                    {index < cycleError.cyclePath!.length - 1 && (
                      <span className="text-red-400">→</span>
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>
          )}
          <p className="text-xs text-red-500 mt-3">
            💡 DAG（有向无环图）不允许存在循环，请删除部分连线后重试
          </p>
        </div>
      </div>
    </div>
  );
};

export default Toast;
