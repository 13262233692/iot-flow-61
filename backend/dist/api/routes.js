"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const uuid_1 = require("uuid");
const NodeRegistry_1 = require("../core/NodeRegistry");
const FlowRuntime_1 = require("../core/FlowRuntime");
const DAGParser_1 = require("../core/DAGParser");
const router = express_1.default.Router();
router.get('/nodes', (req, res) => {
    const nodes = NodeRegistry_1.nodeRegistry.getAllDefinitions();
    res.json({ nodes });
});
router.get('/flows', (req, res) => {
    const flows = FlowRuntime_1.flowRuntime.getAllFlows();
    res.json({ flows });
});
router.get('/flows/:id', (req, res) => {
    const flow = FlowRuntime_1.flowRuntime.getFlow(req.params.id);
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
    const flow = {
        id: (0, uuid_1.v4)(),
        name,
        description,
        nodes,
        edges,
        createdAt: Date.now(),
        updatedAt: Date.now()
    };
    const validation = DAGParser_1.dagParser.validate(flow);
    if (!validation.valid) {
        return res.status(400).json({
            error: 'Flow validation failed',
            errors: validation.errors,
            hasCycle: validation.cyclePath !== undefined,
            cyclePath: validation.cyclePath
        });
    }
    FlowRuntime_1.flowRuntime.registerFlow(flow);
    res.status(201).json({ flow });
});
router.put('/flows/:id', (req, res) => {
    const existing = FlowRuntime_1.flowRuntime.getFlow(req.params.id);
    if (!existing) {
        return res.status(404).json({ error: 'Flow not found' });
    }
    const { name, description, nodes, edges } = req.body;
    const flow = {
        ...existing,
        name: name ?? existing.name,
        description: description ?? existing.description,
        nodes: nodes ?? existing.nodes,
        edges: edges ?? existing.edges,
        updatedAt: Date.now()
    };
    const validation = DAGParser_1.dagParser.validate(flow);
    if (!validation.valid) {
        return res.status(400).json({
            error: 'Flow validation failed',
            errors: validation.errors,
            hasCycle: validation.cyclePath !== undefined,
            cyclePath: validation.cyclePath
        });
    }
    if (FlowRuntime_1.flowRuntime.isFlowRunning(flow.id)) {
        FlowRuntime_1.flowRuntime.stopFlow(flow.id);
        FlowRuntime_1.flowRuntime.registerFlow(flow);
        FlowRuntime_1.flowRuntime.startFlow(flow.id);
    }
    else {
        FlowRuntime_1.flowRuntime.registerFlow(flow);
    }
    res.json({ flow });
});
router.delete('/flows/:id', (req, res) => {
    const deleted = FlowRuntime_1.flowRuntime.unregisterFlow(req.params.id);
    if (!deleted) {
        return res.status(404).json({ error: 'Flow not found' });
    }
    res.json({ success: true });
});
router.post('/flows/:id/start', (req, res) => {
    try {
        FlowRuntime_1.flowRuntime.startFlow(req.params.id);
        const status = FlowRuntime_1.flowRuntime.getFlowStatus(req.params.id);
        res.json({ status });
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
});
router.post('/flows/:id/stop', (req, res) => {
    FlowRuntime_1.flowRuntime.stopFlow(req.params.id);
    const status = FlowRuntime_1.flowRuntime.getFlowStatus(req.params.id);
    res.json({ status });
});
router.get('/flows/:id/status', (req, res) => {
    const status = FlowRuntime_1.flowRuntime.getFlowStatus(req.params.id);
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
        FlowRuntime_1.flowRuntime.injectMessage(req.params.id, nodeId, payload);
        res.json({ success: true });
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
});
router.get('/flows/:id/logs', (req, res) => {
    const logs = FlowRuntime_1.flowRuntime.getLogs(req.params.id);
    res.json({ logs });
});
router.get('/logs', (req, res) => {
    const { flowId, nodeId } = req.query;
    const logs = FlowRuntime_1.flowRuntime.getLogs(flowId, nodeId);
    res.json({ logs });
});
router.post('/flows/:id/debug/enable', (req, res) => {
    try {
        FlowRuntime_1.flowRuntime.enableDebug(req.params.id);
        res.json({ success: true, debugEnabled: true });
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
});
router.post('/flows/:id/debug/disable', (req, res) => {
    FlowRuntime_1.flowRuntime.disableDebug(req.params.id);
    res.json({ success: true, debugEnabled: false });
});
router.get('/flows/:id/debug/status', (req, res) => {
    const enabled = FlowRuntime_1.flowRuntime.isDebugEnabled(req.params.id);
    res.json({ debugEnabled: enabled });
});
router.get('/flows/:id/debug/snapshots/edges', (req, res) => {
    const edgeId = req.query.edgeId;
    const snapshots = FlowRuntime_1.flowRuntime.getEdgeSnapshots(req.params.id, edgeId);
    res.json({ snapshots });
});
router.get('/flows/:id/debug/snapshots/nodes', (req, res) => {
    const nodeId = req.query.nodeId;
    const snapshots = FlowRuntime_1.flowRuntime.getNodeSnapshots(req.params.id, nodeId);
    res.json({ snapshots });
});
router.delete('/flows/:id/debug/snapshots', (req, res) => {
    FlowRuntime_1.flowRuntime.clearSnapshots(req.params.id);
    res.json({ success: true });
});
router.post('/flows/:id/debug/dry-run', (req, res) => {
    const { nodeId, payload } = req.body;
    if (!nodeId) {
        return res.status(400).json({ error: 'nodeId is required' });
    }
    try {
        const snapshots = FlowRuntime_1.flowRuntime.dryRun(req.params.id, nodeId, payload);
        res.json({ snapshots });
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
});
exports.default = router;
