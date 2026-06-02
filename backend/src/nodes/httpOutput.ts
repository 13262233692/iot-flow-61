import axios from 'axios';
import { NodeDefinition, NodeMessage, NodeContext, NodeConfig } from '../types';
import { nodeRegistry } from '../core/NodeRegistry';

export const httpOutputDefinition: NodeDefinition = {
  type: 'http-output',
  label: 'HTTP 输出',
  category: '输出',
  icon: '🌐',
  description: '发送HTTP请求',
  inputs: [{ id: 'input', label: '输入', type: 'input' }],
  outputs: [],
  defaultConfig: {
    url: 'http://localhost:8080/api/data',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    timeout: 5000,
    retries: 3
  }
};

export const httpOutputHandler = async (
  msg: NodeMessage,
  config: NodeConfig,
  context: NodeContext
): Promise<void> => {
  let attempt = 0;
  const maxAttempts = config.retries || 1;

  while (attempt < maxAttempts) {
    try {
      await axios({
        url: config.url,
        method: config.method || 'POST',
        headers: config.headers || {},
        data: msg.payload,
        timeout: config.timeout || 5000
      });

      context.log('info', `HTTP request successful: ${config.method} ${config.url}`);
      return;
    } catch (error: any) {
      attempt++;
      const errorMsg = error.response 
        ? `HTTP ${error.response.status}: ${error.response.statusText}`
        : error.message;

      if (attempt >= maxAttempts) {
        context.log('error', `HTTP request failed after ${maxAttempts} attempts: ${errorMsg}`);
        throw error;
      }

      context.log('warn', `HTTP request failed (attempt ${attempt}/${maxAttempts}): ${errorMsg}`);
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
};

nodeRegistry.register(httpOutputDefinition, httpOutputHandler);
