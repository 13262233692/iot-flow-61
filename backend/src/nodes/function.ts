import { NodeDefinition, NodeMessage, NodeContext, NodeConfig } from '../types';
import { nodeRegistry } from '../core/NodeRegistry';
import { NodeVM } from 'vm2';

export const functionDefinition: NodeDefinition = {
  type: 'function',
  label: '函数处理',
  category: '处理',
  icon: '⚙️',
  description: '使用JavaScript处理消息',
  inputs: [{ id: 'input', label: '输入', type: 'input' }],
  outputs: [{ id: 'output', label: '输出', type: 'output' }],
  defaultConfig: {
    code: `// 处理函数
// msg 包含 payload, topic, timestamp 等属性
// 返回新的消息或消息数组

return {
  ...msg,
  processed: true,
  payload: msg.payload
};`
  }
};

export const functionHandler = (
  msg: NodeMessage,
  config: NodeConfig,
  context: NodeContext
): NodeMessage | NodeMessage[] | void => {
  const vm = new NodeVM({
    sandbox: {
      msg,
      context: {
        get: context.getState,
        set: context.setState,
        clear: context.clearState
      },
      log: (message: string) => context.log('info', message)
    },
    allowAsync: true,
    timeout: 5000
  });

  try {
    const wrapperCode = `
      ${config.code}
    `;
    
    const result = vm.run(wrapperCode);
    
    if (result === null || result === undefined) {
      return;
    }

    if (Array.isArray(result)) {
      return result.map((item, index) => ({
        payload: item.payload ?? item,
        topic: item.topic ?? msg.topic,
        timestamp: Date.now(),
        sourceNodeId: context.nodeId,
        metadata: { ...item.metadata, ...msg.metadata }
      }));
    }

    return {
      payload: result.payload ?? result,
      topic: result.topic ?? msg.topic,
      timestamp: Date.now(),
      sourceNodeId: context.nodeId,
      metadata: { ...result.metadata, ...msg.metadata }
    };
  } catch (error: any) {
    context.log('error', `Function error: ${error.message}`);
    throw error;
  }
};

nodeRegistry.register(functionDefinition, functionHandler);
