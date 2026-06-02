"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.aggregateHandler = exports.aggregateDefinition = void 0;
const NodeRegistry_1 = require("../core/NodeRegistry");
exports.aggregateDefinition = {
    type: 'aggregate',
    label: '数据聚合',
    category: '处理',
    icon: '📊',
    description: '聚合多条消息数据',
    inputs: [{ id: 'input', label: '输入', type: 'input' }],
    outputs: [{ id: 'output', label: '输出', type: 'output' }],
    defaultConfig: {
        mode: 'window',
        windowSize: 10,
        windowTime: 5000,
        operation: 'average',
        field: 'value'
    }
};
const aggregateHandler = (msg, config, context) => {
    let state = context.getState('aggregateState');
    if (!state) {
        state = {
            buffer: [],
            lastFlush: Date.now()
        };
        context.setState('aggregateState', state);
    }
    state.buffer.push(msg);
    const shouldFlushBySize = config.mode === 'window' && state.buffer.length >= config.windowSize;
    const shouldFlushByTime = config.mode === 'time' &&
        Date.now() - state.lastFlush >= config.windowTime;
    const shouldFlushByBoth = config.mode === 'both' &&
        (state.buffer.length >= config.windowSize || Date.now() - state.lastFlush >= config.windowTime);
    if (shouldFlushBySize || shouldFlushByTime || shouldFlushByBoth) {
        const result = computeAggregate(state.buffer, config);
        state.buffer = [];
        state.lastFlush = Date.now();
        return {
            payload: result,
            topic: msg.topic,
            timestamp: Date.now(),
            sourceNodeId: context.nodeId,
            metadata: {
                count: state.buffer.length,
                operation: config.operation
            }
        };
    }
    context.setState('aggregateState', state);
};
exports.aggregateHandler = aggregateHandler;
function computeAggregate(messages, config) {
    const values = messages.map(m => {
        if (typeof m.payload === 'object' && m.payload !== null) {
            return config.field ? m.payload[config.field] : m.payload;
        }
        return m.payload;
    }).filter(v => v !== undefined && v !== null);
    switch (config.operation) {
        case 'sum':
            return values.reduce((a, b) => a + (Number(b) || 0), 0);
        case 'average':
            return values.length > 0
                ? values.reduce((a, b) => a + (Number(b) || 0), 0) / values.length
                : 0;
        case 'min':
            return Math.min(...values.map(v => Number(v) || Infinity));
        case 'max':
            return Math.max(...values.map(v => Number(v) || -Infinity));
        case 'count':
            return values.length;
        case 'concat':
            return values;
        case 'first':
            return values[0];
        case 'last':
            return values[values.length - 1];
        default:
            return values;
    }
}
NodeRegistry_1.nodeRegistry.register(exports.aggregateDefinition, exports.aggregateHandler);
