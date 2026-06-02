import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { FlowDefinition } from '../types';
import { nodeRegistry } from '../core/NodeRegistry';
import { flowRuntime } from '../core/FlowRuntime';
import { dagParser } from '../core/DAGParser';

const router = express.Router();

router.get('/nodes', (req, res) => {
  const nodes = nodeRegistry.getAllDefinitions();
  res.json({ nodes });
});

router.get('/flows', (req, res) => {
  const flows = flowRuntime.getAllFlows();
  res.json({ flows });
});

router.get('/flows/:id', (req, res) => {
  const flow = flowRuntime.getFlow(req.params.id);
  if (!flow) {
    return res.status(404).json({ error: 'Flow not found' });
  }
  res.json({ flow });
});

router.post('/flows', (req, res) => {
  const { name, description, nodes, edges } = req.body;
  
  if (!name || !Array.isArray(nodes) || !Array.isArray(edges)) {
    return res.status(400).json({ error: 'Invalid flow data' });
  }

  const flow: FlowDefinition = {
    id: uuidv4(),
    name,
    description,
    nodes,
    edges,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };

  const validation = dagParser.validate(flow);
  if (!validation.valid) {
    return res.status(400).json({ 
      error: 'Flow validation failed', 
      errors: validation.errors,
      hasCycle: validation.cyclePath !== undefined,
      cyclePath: validation.cyclePath
    });
  }

  flowRuntime.registerFlow(flow);
  res.status(201).json({ flow });
});

router.put('/flows/:id', (req, res) => {
  const existing = flowRuntime.getFlow(req.params.id);
  if (!existing) {
    return res.status(404).json({ error: 'Flow not found' });
  }

  const { name, description, nodes, edges } = req.body;
  
  const flow: FlowDefinition = {
    ...existing,
    name: name ?? existing.name,
    description: description ?? existing.description,
    nodes: nodes ?? existing.nodes,
    edges: edges ?? existing.edges,
    updatedAt: Date.now()
  };

  const validation = dagParser.validate(flow);
  if (!validation.valid) {
    return res.status(400).json({ 
      error: 'Flow validation failed', 
      errors: validation.errors,
      hasCycle: validation.cyclePath !== undefined,
      cyclePath: validation.cyclePath
    });
  }

  if (flowRuntime.isFlowRunning(flow.id)) {
    flowRuntime.stopFlow(flow.id);
    flowRuntime.registerFlow(flow);
    flowRuntime.startFlow(flow.id);
  } else {
    flowRuntime.registerFlow(flow);
  }

  res.json({ flow });
});

router.delete('/flows/:id', (req, res) => {
  const deleted = flowRuntime.unregisterFlow(req.params.id);
  if (!deleted) {
    return res.status(404).json({ error: 'Flow not found' });
  }
  res.json({ success: true });
});

router.post('/flows/:id/start', (req, res) => {
  try {
    flowRuntime.startFlow(req.params.id);
    const status = flowRuntime.getFlowStatus(req.params.id);
    res.json({ status });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/flows/:id/stop', (req, res) => {
  flowRuntime.stopFlow(req.params.id);
  const status = flowRuntime.getFlowStatus(req.params.id);
  res.json({ status });
});

router.get('/flows/:id/status', (req, res) => {
  const status = flowRuntime.getFlowStatus(req.params.id);
  if (!status) {
    return res.status(404).json({ error: 'Flow not found' });
  }
  res.json({ status });
});

router.post('/flows/:id/inject', (req, res) => {
  const { nodeId, payload } = req.body;
  
  if (!nodeId) {
    return res.status(400).json({ error: 'nodeId is required' });
  }

  try {
    flowRuntime.injectMessage(req.params.id, nodeId, payload);
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/flows/:id/logs', (req, res) => {
  const logs = flowRuntime.getLogs(req.params.id);
  res.json({ logs });
});

router.get('/logs', (req, res) => {
  const { flowId, nodeId } = req.query;
  const logs = flowRuntime.getLogs(
    flowId as string | undefined,
    nodeId as string | undefined
  );
  res.json({ logs });
});

router.post('/flows/:id/debug/enable', (req, res) => {
  try {
    flowRuntime.enableDebug(req.params.id);
    res.json({ success: true, debugEnabled: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/flows/:id/debug/disable', (req, res) => {
  flowRuntime.disableDebug(req.params.id);
  res.json({ success: true, debugEnabled: false });
});

router.get('/flows/:id/debug/status', (req, res) => {
  const enabled = flowRuntime.isDebugEnabled(req.params.id);
  res.json({ debugEnabled: enabled });
});

router.get('/flows/:id/debug/snapshots/edges', (req, res) => {
  const edgeId = req.query.edgeId as string | undefined;
  const snapshots = flowRuntime.getEdgeSnapshots(req.params.id, edgeId);
  res.json({ snapshots });
});

router.get('/flows/:id/debug/snapshots/nodes', (req, res) => {
  const nodeId = req.query.nodeId as string | undefined;
  const snapshots = flowRuntime.getNodeSnapshots(req.params.id, nodeId);
  res.json({ snapshots });
});

router.delete('/flows/:id/debug/snapshots', (req, res) => {
  flowRuntime.clearSnapshots(req.params.id);
  res.json({ success: true });
});

router.post('/flows/:id/debug/dry-run', (req, res) => {
  const { nodeId, payload } = req.body;
  
  if (!nodeId) {
    return res.status(400).json({ error: 'nodeId is required' });
  }

  try {
    const snapshots = flowRuntime.dryRun(req.params.id, nodeId, payload);
    res.json({ snapshots });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
