import { NodeDefinition, NodeMessage, NodeContext } from '../types';
export declare const mqttInputDefinition: NodeDefinition;
export declare const mqttInputHandler: (msg: NodeMessage, config: any, context: NodeContext) => Promise<void>;
