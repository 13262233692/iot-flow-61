"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.mqttInputHandler = exports.mqttInputDefinition = void 0;
const mqtt_1 = __importDefault(require("mqtt"));
const NodeRegistry_1 = require("../core/NodeRegistry");
exports.mqttInputDefinition = {
    type: 'mqtt-input',
    label: 'MQTT 输入',
    category: '输入',
    icon: '📡',
    description: '从MQTT broker订阅消息',
    inputs: [],
    outputs: [{ id: 'output', label: '输出', type: 'output' }],
    defaultConfig: {
        brokerUrl: 'mqtt://localhost:1883',
        topic: 'iot/sensors/#',
        username: '',
        password: '',
        clientId: ''
    }
};
const clients = new Map();
const mqttInputHandler = async (msg, config, context) => {
    const clientKey = `${context.flowId}-${context.nodeId}`;
    if (clients.has(clientKey)) {
        return;
    }
    const client = mqtt_1.default.connect(config.brokerUrl, {
        username: config.username || undefined,
        password: config.password || undefined,
        clientId: config.clientId || `iot-flow-${clientKey}-${Date.now()}`
    });
    clients.set(clientKey, client);
    client.on('connect', () => {
        context.log('info', `Connected to MQTT broker: ${config.brokerUrl}`);
        client.subscribe(config.topic, (err) => {
            if (err) {
                context.log('error', `Failed to subscribe: ${err.message}`);
            }
            else {
                context.log('info', `Subscribed to topic: ${config.topic}`);
            }
        });
    });
    client.on('message', (topic, payload) => {
        let parsedPayload;
        try {
            parsedPayload = JSON.parse(payload.toString());
        }
        catch {
            parsedPayload = payload.toString();
        }
        const outputMsg = {
            payload: parsedPayload,
            topic,
            timestamp: Date.now(),
            sourceNodeId: context.nodeId,
            metadata: {
                mqttTopic: topic,
                mqttQos: 0
            }
        };
        context.send(outputMsg);
    });
    client.on('error', (err) => {
        context.log('error', `MQTT error: ${err.message}`);
    });
    client.on('close', () => {
        context.log('warn', 'MQTT connection closed');
    });
    const cleanup = () => {
        client.end();
        clients.delete(clientKey);
        context.log('info', 'MQTT client disconnected');
    };
    context.setState('cleanup', cleanup);
};
exports.mqttInputHandler = mqttInputHandler;
NodeRegistry_1.nodeRegistry.register(exports.mqttInputDefinition, exports.mqttInputHandler);
