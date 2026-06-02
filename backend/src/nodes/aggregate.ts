import { NodeDefinition, NodeMessage, NodeContext, NodeConfig } from '../types';
import { nodeRegistry } from '../core/NodeRegistry';

export const aggregateDefinition: NodeDefinition = {
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

interface AggregateState {
  buffer: NodeMessage[];
  lastFlush: number;
  timer?: NodeJS.Timeout;
}

export const aggregateHandler = (
  msg: NodeMessage,
  config: NodeConfig,
  context: NodeContext
): NodeMessage | void => {
  let state = context.getState<AggregateState>('aggregateState');
  
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

function computeAggregate(messages: NodeMessage[], config: NodeConfig): any {
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

nodeRegistry.register(aggregateDefinition, aggregateHandler);
