import { NodeDefinition, NodeHandler, NodeConfig } from '../types';

export class NodeRegistry {
  private definitions: Map<string, NodeDefinition> = new Map();
  private handlers: Map<string, NodeHandler> = new Map();

  register(definition: NodeDefinition, handler: NodeHandler): void {
    if (this.definitions.has(definition.type)) {
      throw new Error(`Node type "${definition.type}" is already registered`);
    }
    this.definitions.set(definition.type, definition);
    this.handlers.set(definition.type, handler);
  }

  unregister(type: string): boolean {
    return this.definitions.delete(type) && this.handlers.delete(type);
  }

  getDefinition(type: string): NodeDefinition | undefined {
    return this.definitions.get(type);
  }

  getHandler(type: string): NodeHandler | undefined {
    return this.handlers.get(type);
  }

  getAllDefinitions(): NodeDefinition[] {
    return Array.from(this.definitions.values());
  }

  has(type: string): boolean {
    return this.definitions.has(type);
  }

  createDefaultConfig(type: string): NodeConfig {
    const def = this.getDefinition(type);
    if (!def) {
      throw new Error(`Unknown node type: ${type}`);
    }
    return { ...def.defaultConfig };
  }
}

export const nodeRegistry = new NodeRegistry();
