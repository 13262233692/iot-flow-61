import { NodeDefinition, NodeHandler, NodeConfig } from '../types';
export declare class NodeRegistry {
    private definitions;
    private handlers;
    register(definition: NodeDefinition, handler: NodeHandler): void;
    unregister(type: string): boolean;
    getDefinition(type: string): NodeDefinition | undefined;
    getHandler(type: string): NodeHandler | undefined;
    getAllDefinitions(): NodeDefinition[];
    has(type: string): boolean;
    createDefaultConfig(type: string): NodeConfig;
}
export declare const nodeRegistry: NodeRegistry;
