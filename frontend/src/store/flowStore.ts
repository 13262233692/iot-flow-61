import { create } from 'zustand';
import {
  FlowDefinition,
  FlowNode,
  FlowEdge,
  NodeDefinition,
  FlowStatus,
  FlowLogEntry,
  EdgeSnapshots,
  NodeSnapshots
} from '../types';
import { flowAPI } from '../api/client';
import { wouldCreateCycle, findCyclePath } from '../utils/cycleDetect';

interface CycleError {
  message: string;
  cyclePath: string[] | null;
  timestamp: number;
}

interface FlowState {
  flows: FlowDefinition[];
  currentFlowId: string | null;
  nodes: NodeDefinition[];
  flowStatus: FlowStatus | null;
  logs: FlowLogEntry[];
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  cycleError: CycleError | null;
  debugEnabled: boolean;
  edgeSnapshots: EdgeSnapshots[];
  nodeSnapshots: NodeSnapshots[];
  dryRunResult: NodeSnapshots[] | null;

  loadNodes: () => Promise<void>;
  loadFlows: () => Promise<void>;
  setCurrentFlow: (id: string | null) => void;
  createFlow: (flow: Partial<FlowDefinition>) => Promise<FlowDefinition>;
  updateCurrentFlow: (flow: Partial<FlowDefinition>) => Promise<void>;
  deleteFlow: (id: string) => Promise<void>;
  
  startFlow: (id: string) => Promise<void>;
  stopFlow: (id: string) => Promise<void>;
  loadFlowStatus: (id: string) => Promise<void>;
  loadLogs: (flowId?: string) => Promise<void>;
  
  addNode: (node: FlowNode) => void;
  updateNode: (id: string, updates: Partial<FlowNode>) => void;
  deleteNode: (id: string) => void;
  
  addEdge: (edge: FlowEdge) => { success: boolean; error?: string };
  updateEdge: (id: string, updates: Partial<FlowEdge>) => void;
  deleteEdge: (id: string) => void;
  
  setSelectedNode: (id: string | null) => void;
  setSelectedEdge: (id: string | null) => void;
  clearCycleError: () => void;
  
  enableDebug: () => Promise<void>;
  disableDebug: () => Promise<void>;
  loadEdgeSnapshots: (edgeId?: string) => Promise<void>;
  loadNodeSnapshots: (nodeId?: string) => Promise<void>;
  clearSnapshots: () => Promise<void>;
  executeDryRun: (nodeId: string, payload: any) => Promise<void>;
  clearDryRunResult: () => void;
  
  getCurrentFlow: () => FlowDefinition | undefined;
}

export const useFlowStore = create<FlowState>((set, get) => ({
  flows: [],
  currentFlowId: null,
  nodes: [],
  flowStatus: null,
  logs: [],
  selectedNodeId: null,
  selectedEdgeId: null,
  cycleError: null,
  debugEnabled: false,
  edgeSnapshots: [],
  nodeSnapshots: [],
  dryRunResult: null,

  loadNodes: async () => {
    const nodes = await flowAPI.getNodes();
    set({ nodes });
  },

  loadFlows: async () => {
    const flows = await flowAPI.getFlows();
    set({ flows });
  },

  setCurrentFlow: (id) => {
    set({ currentFlowId: id, selectedNodeId: null });
    if (id) {
      get().loadFlowStatus(id);
      get().loadLogs(id);
    }
  },

  createFlow: async (flow) => {
    const newFlow = await flowAPI.createFlow(flow);
    set((state) => ({ flows: [...state.flows, newFlow] }));
    return newFlow;
  },

  updateCurrentFlow: async (updates) => {
    const { currentFlowId, flows } = get();
    if (!currentFlowId) return;

    const updatedFlow = await flowAPI.updateFlow(currentFlowId, updates);
    set({
      flows: flows.map((f) => (f.id === currentFlowId ? updatedFlow : f))
    });
  },

  deleteFlow: async (id) => {
    await flowAPI.deleteFlow(id);
    set((state) => ({
      flows: state.flows.filter((f) => f.id !== id),
      currentFlowId: state.currentFlowId === id ? null : state.currentFlowId
    }));
  },

  startFlow: async (id) => {
    const status = await flowAPI.startFlow(id);
    set({ flowStatus: status });
  },

  stopFlow: async (id) => {
    const status = await flowAPI.stopFlow(id);
    set({ flowStatus: status });
  },

  loadFlowStatus: async (id) => {
    try {
      const status = await flowAPI.getFlowStatus(id);
      set({ flowStatus: status });
    } catch {
      set({ flowStatus: null });
    }
  },

  loadLogs: async (flowId) => {
    const logs = await flowAPI.getLogs(flowId);
    set({ logs });
  },

  addNode: (node) => {
    const { currentFlowId, flows } = get();
    if (!currentFlowId) return;

    set({
      flows: flows.map((f) =>
        f.id === currentFlowId
          ? { ...f, nodes: [...f.nodes, node], updatedAt: Date.now() }
          : f
      )
    });
  },

  updateNode: (id, updates) => {
    const { currentFlowId, flows } = get();
    if (!currentFlowId) return;

    set({
      flows: flows.map((f) =>
        f.id === currentFlowId
          ? {
              ...f,
              nodes: f.nodes.map((n) =>
                n.id === id ? { ...n, ...updates } : n
              ),
              updatedAt: Date.now()
            }
          : f
      )
    });
  },

  deleteNode: (id) => {
    const { currentFlowId, flows } = get();
    if (!currentFlowId) return;

    set({
      flows: flows.map((f) =>
        f.id === currentFlowId
          ? {
              ...f,
              nodes: f.nodes.filter((n) => n.id !== id),
              edges: f.edges.filter((e) => e.source !== id && e.target !== id),
              updatedAt: Date.now()
            }
          : f
      ),
      selectedNodeId: get().selectedNodeId === id ? null : get().selectedNodeId
    });
  },

  addEdge: (edge) => {
    const { currentFlowId, flows } = get();
    if (!currentFlowId) return { success: false, error: 'No flow selected' };

    const currentFlow = flows.find(f => f.id === currentFlowId);
    if (!currentFlow) return { success: false, error: 'Flow not found' };

    if (wouldCreateCycle(currentFlow.edges, edge.source, edge.target)) {
      const cyclePath = findCyclePath(currentFlow.edges, edge.source, edge.target);
      const errorMsg = '该连线会形成循环依赖，DAG 不允许存在环路';
      set({
        cycleError: {
          message: errorMsg,
          cyclePath,
          timestamp: Date.now()
        }
      });
      return { success: false, error: errorMsg };
    }

    set({
      flows: flows.map((f) =>
        f.id === currentFlowId
          ? { ...f, edges: [...f.edges, edge], updatedAt: Date.now() }
          : f
      ),
      cycleError: null
    });
    return { success: true };
  },

  updateEdge: (id, updates) => {
    const { currentFlowId, flows } = get();
    if (!currentFlowId) return;

    set({
      flows: flows.map((f) =>
        f.id === currentFlowId
          ? {
              ...f,
              edges: f.edges.map((e) =>
                e.id === id ? { ...e, ...updates } : e
              ),
              updatedAt: Date.now()
            }
          : f
      )
    });
  },

  deleteEdge: (id) => {
    const { currentFlowId, flows } = get();
    if (!currentFlowId) return;

    set({
      flows: flows.map((f) =>
        f.id === currentFlowId
          ? { ...f, edges: f.edges.filter((e) => e.id !== id), updatedAt: Date.now() }
          : f
      )
    });
  },

  setSelectedNode: (id) => {
    set({ selectedNodeId: id, selectedEdgeId: null });
  },

  setSelectedEdge: (id) => {
    set({ selectedEdgeId: id, selectedNodeId: null });
    if (id) {
      get().loadEdgeSnapshots(id);
    }
  },

  clearCycleError: () => {
    set({ cycleError: null });
  },

  enableDebug: async () => {
    const { currentFlowId } = get();
    if (!currentFlowId) return;
    await flowAPI.enableDebug(currentFlowId);
    set({ debugEnabled: true });
  },

  disableDebug: async () => {
    const { currentFlowId } = get();
    if (!currentFlowId) return;
    await flowAPI.disableDebug(currentFlowId);
    set({ debugEnabled: false, edgeSnapshots: [], nodeSnapshots: [] });
  },

  loadEdgeSnapshots: async (edgeId?: string) => {
    const { currentFlowId } = get();
    if (!currentFlowId) return;
    try {
      const snapshots = await flowAPI.getEdgeSnapshots(currentFlowId, edgeId);
      set({ edgeSnapshots: snapshots });
    } catch {
      set({ edgeSnapshots: [] });
    }
  },

  loadNodeSnapshots: async (nodeId?: string) => {
    const { currentFlowId } = get();
    if (!currentFlowId) return;
    try {
      const snapshots = await flowAPI.getNodeSnapshots(currentFlowId, nodeId);
      set({ nodeSnapshots: snapshots });
    } catch {
      set({ nodeSnapshots: [] });
    }
  },

  clearSnapshots: async () => {
    const { currentFlowId } = get();
    if (!currentFlowId) return;
    await flowAPI.clearSnapshots(currentFlowId);
    set({ edgeSnapshots: [], nodeSnapshots: [] });
  },

  executeDryRun: async (nodeId: string, payload: any) => {
    const { currentFlowId } = get();
    if (!currentFlowId) return;
    try {
      const snapshots = await flowAPI.dryRun(currentFlowId, nodeId, payload);
      set({ dryRunResult: snapshots });
    } catch (error: any) {
      set({ dryRunResult: null });
    }
  },

  clearDryRunResult: () => {
    set({ dryRunResult: null });
  },

  getCurrentFlow: () => {
    const { flows, currentFlowId } = get();
    return flows.find((f) => f.id === currentFlowId);
  }
}));
