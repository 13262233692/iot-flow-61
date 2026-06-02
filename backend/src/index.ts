import express from 'express';
import cors from 'cors';
import './nodes';
import routes from './api/routes';
import { flowRuntime } from './core/FlowRuntime';
import { v4 as uuidv4 } from 'uuid';
import { FlowDefinition } from './types';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.use('/api', routes);

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: Date.now(),
    flows: flowRuntime.getAllFlows().length
  });
});

const sampleFlow: FlowDefinition = {
  id: uuidv4(),
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

flowRuntime.registerFlow(sampleFlow);

app.listen(PORT, () => {
  console.log(`IoT Flow Designer Backend running on port ${PORT}`);
  console.log(`API: http://localhost:${PORT}/api`);
  console.log(`Health: http://localhost:${PORT}/api/health`);
  console.log(`Sample flow registered: ${sampleFlow.id}`);
});
