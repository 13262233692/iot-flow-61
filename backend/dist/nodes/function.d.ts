import { NodeDefinition, NodeMessage, NodeContext, NodeConfig } from '../types';
export declare const functionDefinition: NodeDefinition;
export declare const functionHandler: (msg: NodeMessage, config: NodeConfig, context: NodeContext) => NodeMessage | NodeMessage[] | void;
