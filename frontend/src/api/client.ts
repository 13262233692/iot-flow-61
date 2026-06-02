import axios from 'axios';
import { FlowDefinition, NodeDefinition, FlowStatus, FlowLogEntry, EdgeSnapshots, NodeSnapshots } from '../types';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

export const flowAPI = {
  getNodes: async (): Promise<NodeDefinition[]> => {
    const response = await api.get('/nodes');
    return response.data.nodes;
  },

  getFlows: async (): Promise<FlowDefinition[]> => {
    const response = await api.get('/flows');
    return response.data.flows;
  },

  getFlow: async (id: string): Promise<FlowDefinition> => {
    const response = await api.get(`/flows/${id}`);
    return response.data.flow;
  },

  createFlow: async (flow: Partial<FlowDefinition>): Promise<FlowDefinition> => {
    const response = await api.post('/flows', flow);
    return response.data.flow;
  },

  updateFlow: async (id: string, flow: Partial<FlowDefinition>): Promise<FlowDefinition> => {
    const response = await api.put(`/flows/${id}`, flow);
    return response.data.flow;
  },

  deleteFlow: async (id: string): Promise<void> => {
    await api.delete(`/flows/${id}`);
  },

  startFlow: async (id: string): Promise<FlowStatus> => {
    const response = await api.post(`/flows/${id}/start`);
    return response.data.status;
  },

  stopFlow: async (id: string): Promise<FlowStatus> => {
    const response = await api.post(`/flows/${id}/stop`);
    return response.data.status;
  },

  getFlowStatus: async (id: string): Promise<FlowStatus> => {
    const response = await api.get(`/flows/${id}/status`);
    return response.data.status;
  },

  injectMessage: async (flowId: string, nodeId: string, payload: any): Promise<void> => {
    await api.post(`/flows/${flowId}/inject`, { nodeId, payload });
  },

  getLogs: async (flowId?: string, nodeId?: string): Promise<FlowLogEntry[]> => {
    const params: any = {};
    if (flowId) params.flowId = flowId;
    if (nodeId) params.nodeId = nodeId;
    const response = await api.get('/logs', { params });
    return response.data.logs;
  },

  enableDebug: async (flowId: string): Promise<boolean> => {
    const response = await api.post(`/flows/${flowId}/debug/enable`);
    return response.data.debugEnabled;
  },

  disableDebug: async (flowId: string): Promise<boolean> => {
    const response = await api.post(`/flows/${flowId}/debug/disable`);
    return response.data.debugEnabled;
  },

  getDebugStatus: async (flowId: string): Promise<boolean> => {
    const response = await api.get(`/flows/${flowId}/debug/status`);
    return response.data.debugEnabled;
  },

  getEdgeSnapshots: async (flowId: string, edgeId?: string): Promise<EdgeSnapshots[]> => {
    const params: any = {};
    if (edgeId) params.edgeId = edgeId;
    const response = await api.get(`/flows/${flowId}/debug/snapshots/edges`, { params });
    return response.data.snapshots;
  },

  getNodeSnapshots: async (flowId: string, nodeId?: string): Promise<NodeSnapshots[]> => {
    const params: any = {};
    if (nodeId) params.nodeId = nodeId;
    const response = await api.get(`/flows/${flowId}/debug/snapshots/nodes`, { params });
    return response.data.snapshots;
  },

  clearSnapshots: async (flowId: string): Promise<void> => {
    await api.delete(`/flows/${flowId}/debug/snapshots`);
  },

  dryRun: async (flowId: string, nodeId: string, payload: any): Promise<NodeSnapshots[]> => {
    const response = await api.post(`/flows/${flowId}/debug/dry-run`, { nodeId, payload });
    return response.data.snapshots;
  }
};

export default api;
