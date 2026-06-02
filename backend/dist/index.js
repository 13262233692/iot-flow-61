"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
require("./nodes");
const routes_1 = __importDefault(require("./api/routes"));
const FlowRuntime_1 = require("./core/FlowRuntime");
const uuid_1 = require("uuid");
const app = (0, express_1.default)();
const PORT = process.env.PORT || 4000;
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use('/api', routes_1.default);
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: Date.now(),
        flows: FlowRuntime_1.flowRuntime.getAllFlows().length
    });
});
const sampleFlow = {
    id: (0, uuid_1.v4)(),
    name: '示例数据流',
    description: '一个简单的示例数据流',
    nodes: [
        {
            id: 'node-1',
            type: 'mqtt-input',
            label: '传感器数据',
            config: {
                brokerUrl: 'mqtt://test.mosquitto.org',
                topic: 'iot/sensors/#',
                username: '',
                password: ''
            },
            position: { x: 100, y: 100 }
        },
        {
            id: 'node-2',
            type: 'function',
            label: '数据转换',
            config: {
                code: `return {
  ...msg,
  payload: {
    ...msg.payload,
    transformed: true,
    timestamp: new Date().toISOString()
  }
};`
            },
            position: { x: 350, y: 100 }
        },
        {
            id: 'node-3',
            type: 'aggregate',
            label: '数据聚合',
            config: {
                mode: 'window',
                windowSize: 5,
                operation: 'average',
                field: 'value'
            },
            position: { x: 600, y: 100 }
        },
        {
            id: 'node-4',
            type: 'http-output',
            label: '发送到API',
            config: {
                url: 'http://localhost:8080/api/data',
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            },
            position: { x: 850, y: 100 }
        }
    ],
    edges: [
        { id: 'edge-1', source: 'node-1', target: 'node-2' },
        { id: 'edge-2', source: 'node-2', target: 'node-3' },
        { id: 'edge-3', source: 'node-3', target: 'node-4' }
    ],
    createdAt: Date.now(),
    updatedAt: Date.now()
};
FlowRuntime_1.flowRuntime.registerFlow(sampleFlow);
app.listen(PORT, () => {
    console.log(`IoT Flow Designer Backend running on port ${PORT}`);
    console.log(`API: http://localhost:${PORT}/api`);
    console.log(`Health: http://localhost:${PORT}/api/health`);
    console.log(`Sample flow registered: ${sampleFlow.id}`);
});
