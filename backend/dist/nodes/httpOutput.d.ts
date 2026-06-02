import { NodeDefinition, NodeMessage, NodeContext, NodeConfig } from '../types';
export declare const httpOutputDefinition: NodeDefinition;
export declare const httpOutputHandler: (msg: NodeMessage, config: NodeConfig, context: NodeContext) => Promise<void>;
