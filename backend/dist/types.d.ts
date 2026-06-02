export interface NodePort {
    id: string;
    label: string;
    type: 'input' | 'output';
}
export interface NodeConfig {
    [key: string]: any;
}
export interface FlowNode {
    id: string;
    type: string;
    label: string;
    config: NodeConfig;
    position?: {
        x: number;
        y: number;
    };
}
export interface FlowEdge {
    id: string;
    source: string;
    target: string;
    sourcePort?: string;
    targetPort?: string;
}
export interface FlowDefinition {
    id: string;
    name: string;
    description?: string;
    nodes: FlowNode[];
    edges: FlowEdge[];
    createdAt: number;
    updatedAt: number;
}
export interface FlowStatus {
    flowId: string;
    running: boolean;
    startTime?: number;
    nodeStatuses: {
        [nodeId: string]: {
            status: 'idle' | 'running' | 'error';
            lastMessage?: any;
            error?: string;
        };
    };
}
export interface NodeMessage {
    payload: any;
    topic?: string;
    timestamp: number;
    sourceNodeId?: string;
    metadata?: Record<string, any>;
}
export interface NodeDefinition {
    type: string;
    label: string;
    category: string;
    icon?: string;
    description?: string;
    inputs: NodePort[];
    outputs: NodePort[];
    defaultConfig: NodeConfig;
}
export type NodeHandler = (msg: NodeMessage, config: NodeConfig, context: NodeContext) => Promise<NodeMessage | NodeMessage[] | void> | NodeMessage | NodeMessage[] | void;
export interface NodeContext {
    nodeId: string;
    flowId: string;
    send: (msg: NodeMessage, outputPort?: string) => void;
    log: (level: 'info' | 'warn' | 'error', message: string) => void;
    getState: <T = any>(key: string) => T | undefined;
    setState: <T = any>(key: string, value: T) => void;
    clearState: () => void;
}
export interface MessageSnapshot {
    edgeId: string;
    sourceNodeId: string;
    targetNodeId: string;
    message: NodeMessage;
    capturedAt: number;
    direction: 'output' | 'input';
}
export interface EdgeSnapshots {
    edgeId: string;
    sourceNodeId: string;
    targetNodeId: string;
    samples: MessageSnapshot[];
    totalMessages: number;
}
export interface NodeSnapshots {
    nodeId: string;
    nodeType: string;
    nodeLabel: string;
    inputSnapshots: MessageSnapshot[];
    outputSnapshots: MessageSnapshot[];
    totalInputMessages: number;
    totalOutputMessages: number;
}
