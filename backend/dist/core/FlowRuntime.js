"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.flowRuntime = exports.FlowRuntime = void 0;
const events_1 = require("events");
const NodeRegistry_1 = require("./NodeRegistry");
const DAGParser_1 = require("./DAGParser");
const MAX_MESSAGE_DEPTH = 64;
const MAX_SAMPLES_PER_EDGE = 50;
const SAMPLE_RATE = 1;
class FlowRuntime extends events_1.EventEmitter {
    flows = new Map();
    runningFlows = new Map();
    logs = [];
    maxLogs = 1000;
    debugStates = new Map();
    registerFlow(flow) {
        this.flows.set(flow.id, flow);
    }
    unregisterFlow(flowId) {
        this.stopFlow(flowId);
        return this.flows.delete(flowId);
    }
    getFlow(flowId) {
        return this.flows.get(flowId);
    }
    getAllFlows() {
        return Array.from(this.flows.values());
    }
    startFlow(flowId) {
        const flow = this.flows.get(flowId);
        if (!flow) {
            throw new Error(`Flow not found: ${flowId}`);
        }
        if (this.runningFlows.has(flowId)) {
            throw new Error(`Flow is already running: ${flowId}`);
        }
        const validation = DAGParser_1.dagParser.validate(flow);
        if (!validation.valid) {
            throw new Error(`Flow validation failed: ${validation.errors.join(', ')}`);
        }
        const parsedDAG = DAGParser_1.dagParser.parse(flow);
        const nodes = new Map();
        flow.nodes.forEach(node => {
            const instance = {
                id: node.id,
                type: node.type,
                config: { ...node.config },
                state: new Map(),
                context: this.createNodeContext(flowId, node.id)
            };
            nodes.set(node.id, instance);
        });
        const status = {
            flowId,
            running: true,
            startTime: Date.now(),
            nodeStatuses: {}
        };
        flow.nodes.forEach(node => {
            status.nodeStatuses[node.id] = {
                status: 'idle',
                lastMessage: undefined,
                error: undefined
            };
        });
        this.runningFlows.set(flowId, {
            parsedDAG,
            nodes,
            status,
            startTime: Date.now()
        });
        this.initializeSourceNodes(flowId, parsedDAG, nodes);
        this.emit('flow:started', { flowId });
    }
    createNodeContext(flowId, nodeId) {
        return {
            nodeId,
            flowId,
            send: (msg, outputPort) => {
                this.sendMessage(flowId, nodeId, msg, outputPort);
            },
            log: (level, message) => {
                this.addLog({ flowId, nodeId, level, message, timestamp: Date.now() });
            },
            getState: (key) => {
                const running = this.runningFlows.get(flowId);
                if (!running)
                    return undefined;
                const node = running.nodes.get(nodeId);
                return node?.state.get(key);
            },
            setState: (key, value) => {
                const running = this.runningFlows.get(flowId);
                if (!running)
                    return;
                const node = running.nodes.get(nodeId);
                if (node) {
                    node.state.set(key, value);
                }
            },
            clearState: () => {
                const running = this.runningFlows.get(flowId);
                if (!running)
                    return;
                const node = running.nodes.get(nodeId);
                if (node) {
                    node.state.clear();
                }
            }
        };
    }
    initializeSourceNodes(flowId, parsedDAG, nodes) {
        parsedDAG.sourceNodes.forEach(nodeId => {
            const node = nodes.get(nodeId);
            const handler = NodeRegistry_1.nodeRegistry.getHandler(node.type);
            if (handler) {
                const emptyMsg = {
                    payload: null,
                    timestamp: Date.now(),
                    sourceNodeId: undefined
                };
                const running = this.runningFlows.get(flowId);
                running.status.nodeStatuses[nodeId].status = 'running';
                Promise.resolve(handler(emptyMsg, node.config, node.context))
                    .catch(err => {
                    this.handleNodeError(flowId, nodeId, err);
                });
            }
        });
    }
    sendMessage(flowId, sourceNodeId, msg, outputPort, visitedPath) {
        const running = this.runningFlows.get(flowId);
        if (!running)
            return;
        const currentPath = visitedPath ?? new Set();
        if (currentPath.has(sourceNodeId)) {
            this.addLog({
                flowId,
                nodeId: sourceNodeId,
                level: 'error',
                message: `Detected cycle in message propagation: node ${sourceNodeId} was already visited in this path. Dropping message to prevent infinite loop.`,
                timestamp: Date.now()
            });
            this.handleNodeError(flowId, sourceNodeId, new Error(`Cycle detected: node ${sourceNodeId} is revisited in message path [${[...currentPath, sourceNodeId].join(' -> ')}]`));
            return;
        }
        if (currentPath.size >= MAX_MESSAGE_DEPTH) {
            this.addLog({
                flowId,
                nodeId: sourceNodeId,
                level: 'error',
                message: `Message propagation depth exceeded maximum (${MAX_MESSAGE_DEPTH}). Dropping message to prevent stack overflow.`,
                timestamp: Date.now()
            });
            this.handleNodeError(flowId, sourceNodeId, new Error(`Max message depth (${MAX_MESSAGE_DEPTH}) exceeded`));
            return;
        }
        currentPath.add(sourceNodeId);
        const parsedNode = running.parsedDAG.nodes.get(sourceNodeId);
        if (!parsedNode) {
            currentPath.delete(sourceNodeId);
            return;
        }
        const sourceStatus = running.status.nodeStatuses[sourceNodeId];
        if (sourceStatus) {
            sourceStatus.lastMessage = msg.payload;
            sourceStatus.status = 'idle';
            sourceStatus.error = undefined;
        }
        parsedNode.outgoing.forEach(({ edge, targetNode }) => {
            if (outputPort && edge.sourcePort && edge.sourcePort !== outputPort) {
                return;
            }
            const targetInstance = running.nodes.get(targetNode.id);
            if (!targetInstance)
                return;
            if (currentPath.has(targetNode.id)) {
                this.addLog({
                    flowId,
                    nodeId: targetNode.id,
                    level: 'error',
                    message: `Cycle detected: edge from ${sourceNodeId} to ${targetNode.id} would create a loop. Dropping message.`,
                    timestamp: Date.now()
                });
                this.handleNodeError(flowId, targetNode.id, new Error(`Cycle detected: ${sourceNodeId} -> ${targetNode.id} creates a loop in path [${[...currentPath, targetNode.id].join(' -> ')}]`));
                return;
            }
            const handler = NodeRegistry_1.nodeRegistry.getHandler(targetInstance.type);
            if (!handler) {
                this.addLog({
                    flowId,
                    nodeId: targetNode.id,
                    level: 'error',
                    message: `No handler found for node type: ${targetInstance.type}`,
                    timestamp: Date.now()
                });
                return;
            }
            const targetStatus = running.status.nodeStatuses[targetNode.id];
            if (targetStatus) {
                targetStatus.status = 'running';
            }
            const nextPath = new Set(currentPath);
            const messageToSend = {
                ...msg,
                sourceNodeId: sourceNodeId,
                timestamp: Date.now()
            };
            this.captureSnapshot(flowId, edge.id, sourceNodeId, targetNode.id, messageToSend, 'output');
            Promise.resolve()
                .then(() => handler(messageToSend, targetInstance.config, targetInstance.context))
                .then(result => {
                if (result) {
                    const results = Array.isArray(result) ? result : [result];
                    results.forEach((outputMsg, idx) => {
                        if (outputMsg) {
                            this.captureSnapshot(flowId, edge.id, sourceNodeId, targetNode.id, outputMsg, 'input');
                            this.sendMessage(flowId, targetNode.id, outputMsg, `output${idx}`, nextPath);
                        }
                    });
                }
            })
                .catch(err => {
                this.handleNodeError(flowId, targetNode.id, err);
            });
        });
        currentPath.delete(sourceNodeId);
    }
    handleNodeError(flowId, nodeId, error) {
        const running = this.runningFlows.get(flowId);
        if (!running)
            return;
        const status = running.status.nodeStatuses[nodeId];
        if (status) {
            status.status = 'error';
            status.error = error.message || String(error);
        }
        this.addLog({
            flowId,
            nodeId,
            level: 'error',
            message: error.message || String(error),
            timestamp: Date.now()
        });
        this.emit('node:error', { flowId, nodeId, error });
    }
    stopFlow(flowId) {
        const running = this.runningFlows.get(flowId);
        if (!running)
            return;
        running.status.running = false;
        this.runningFlows.delete(flowId);
        this.emit('flow:stopped', { flowId });
    }
    isFlowRunning(flowId) {
        return this.runningFlows.has(flowId);
    }
    getFlowStatus(flowId) {
        const running = this.runningFlows.get(flowId);
        if (running) {
            return running.status;
        }
        const flow = this.flows.get(flowId);
        if (!flow)
            return undefined;
        const nodeStatuses = {};
        flow.nodes.forEach(node => {
            nodeStatuses[node.id] = { status: 'idle' };
        });
        return {
            flowId,
            running: false,
            nodeStatuses
        };
    }
    addLog(entry) {
        this.logs.push(entry);
        if (this.logs.length > this.maxLogs) {
            this.logs.shift();
        }
        this.emit('log', entry);
    }
    getLogs(flowId, nodeId) {
        let filtered = this.logs;
        if (flowId) {
            filtered = filtered.filter(l => l.flowId === flowId);
        }
        if (nodeId) {
            filtered = filtered.filter(l => l.nodeId === nodeId);
        }
        return [...filtered];
    }
    injectMessage(flowId, nodeId, payload) {
        const running = this.runningFlows.get(flowId);
        if (!running) {
            throw new Error(`Flow is not running: ${flowId}`);
        }
        const node = running.nodes.get(nodeId);
        if (!node) {
            throw new Error(`Node not found: ${nodeId}`);
        }
        const msg = {
            payload,
            timestamp: Date.now()
        };
        this.sendMessage(flowId, nodeId, msg);
    }
    enableDebug(flowId) {
        if (!this.flows.has(flowId)) {
            throw new Error(`Flow not found: ${flowId}`);
        }
        if (!this.debugStates.has(flowId)) {
            this.debugStates.set(flowId, {
                enabled: true,
                edgeSamples: new Map(),
                nodeInputSamples: new Map(),
                nodeOutputSamples: new Map()
            });
        }
        else {
            const ds = this.debugStates.get(flowId);
            ds.enabled = true;
        }
    }
    disableDebug(flowId) {
        const ds = this.debugStates.get(flowId);
        if (ds) {
            ds.enabled = false;
            ds.edgeSamples.clear();
            ds.nodeInputSamples.clear();
            ds.nodeOutputSamples.clear();
        }
    }
    isDebugEnabled(flowId) {
        return this.debugStates.get(flowId)?.enabled ?? false;
    }
    captureSnapshot(flowId, edgeId, sourceNodeId, targetNodeId, msg, direction) {
        const ds = this.debugStates.get(flowId);
        if (!ds || !ds.enabled)
            return;
        const snapshot = {
            edgeId,
            sourceNodeId,
            targetNodeId,
            message: this.sanitizeMessage(msg),
            capturedAt: Date.now(),
            direction
        };
        if (!ds.edgeSamples.has(edgeId)) {
            ds.edgeSamples.set(edgeId, { samples: [], totalMessages: 0 });
        }
        const edgeData = ds.edgeSamples.get(edgeId);
        edgeData.totalMessages++;
        if (edgeData.samples.length < MAX_SAMPLES_PER_EDGE) {
            edgeData.samples.push(snapshot);
        }
        else {
            const idx = Math.floor(Math.random() * edgeData.samples.length);
            edgeData.samples[idx] = snapshot;
        }
        const outputKey = sourceNodeId;
        if (!ds.nodeOutputSamples.has(outputKey)) {
            ds.nodeOutputSamples.set(outputKey, { samples: [], totalMessages: 0 });
        }
        const outputData = ds.nodeOutputSamples.get(outputKey);
        outputData.totalMessages++;
        if (direction === 'output' && outputData.samples.length < MAX_SAMPLES_PER_EDGE) {
            outputData.samples.push(snapshot);
        }
        const inputKey = targetNodeId;
        if (!ds.nodeInputSamples.has(inputKey)) {
            ds.nodeInputSamples.set(inputKey, { samples: [], totalMessages: 0 });
        }
        const inputData = ds.nodeInputSamples.get(inputKey);
        inputData.totalMessages++;
        if (direction === 'input' && inputData.samples.length < MAX_SAMPLES_PER_EDGE) {
            inputData.samples.push(snapshot);
        }
        this.emit('snapshot', { flowId, edgeId, snapshot });
    }
    sanitizeMessage(msg) {
        const payload = msg.payload;
        if (typeof payload === 'object' && payload !== null) {
            try {
                JSON.stringify(payload);
                return { ...msg, payload };
            }
            catch {
                return { ...msg, payload: String(payload) };
            }
        }
        return { ...msg };
    }
    getEdgeSnapshots(flowId, edgeId) {
        const ds = this.debugStates.get(flowId);
        if (!ds)
            return [];
        const results = [];
        ds.edgeSamples.forEach((data, eid) => {
            if (edgeId && eid !== edgeId)
                return;
            const first = data.samples[0];
            results.push({
                edgeId: eid,
                sourceNodeId: first?.sourceNodeId ?? '',
                targetNodeId: first?.targetNodeId ?? '',
                samples: [...data.samples],
                totalMessages: data.totalMessages
            });
        });
        return results;
    }
    getNodeSnapshots(flowId, nodeId) {
        const ds = this.debugStates.get(flowId);
        if (!ds)
            return [];
        const flow = this.flows.get(flowId);
        if (!flow)
            return [];
        const resultNodeIds = nodeId ? [nodeId] : flow.nodes.map(n => n.id);
        return resultNodeIds.map(nid => {
            const flowNode = flow.nodes.find(n => n.id === nid);
            const inputData = ds.nodeInputSamples.get(nid);
            const outputData = ds.nodeOutputSamples.get(nid);
            return {
                nodeId: nid,
                nodeType: flowNode?.type ?? 'unknown',
                nodeLabel: flowNode?.label ?? nid,
                inputSnapshots: inputData?.samples ?? [],
                outputSnapshots: outputData?.samples ?? [],
                totalInputMessages: inputData?.totalMessages ?? 0,
                totalOutputMessages: outputData?.totalMessages ?? 0
            };
        });
    }
    clearSnapshots(flowId) {
        const ds = this.debugStates.get(flowId);
        if (ds) {
            ds.edgeSamples.clear();
            ds.nodeInputSamples.clear();
            ds.nodeOutputSamples.clear();
        }
    }
    dryRun(flowId, startNodeId, payload) {
        const flow = this.flows.get(flowId);
        if (!flow) {
            throw new Error(`Flow not found: ${flowId}`);
        }
        const validation = DAGParser_1.dagParser.validate(flow);
        if (!validation.valid) {
            throw new Error(`Flow validation failed: ${validation.errors.join(', ')}`);
        }
        const wasDebugEnabled = this.isDebugEnabled(flowId);
        if (!wasDebugEnabled) {
            this.enableDebug(flowId);
        }
        const wasRunning = this.isFlowRunning(flowId);
        if (!wasRunning) {
            this.startFlow(flowId);
        }
        this.injectMessage(flowId, startNodeId, payload);
        const snapshots = this.getNodeSnapshots(flowId);
        if (!wasRunning) {
            this.stopFlow(flowId);
        }
        if (!wasDebugEnabled) {
            this.disableDebug(flowId);
        }
        return snapshots;
    }
}
exports.FlowRuntime = FlowRuntime;
exports.flowRuntime = new FlowRuntime();
