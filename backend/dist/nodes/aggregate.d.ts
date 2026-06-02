import { NodeDefinition, NodeMessage, NodeContext, NodeConfig } from '../types';
export declare const aggregateDefinition: NodeDefinition;
export declare const aggregateHandler: (msg: NodeMessage, config: NodeConfig, context: NodeContext) => NodeMessage | void;
