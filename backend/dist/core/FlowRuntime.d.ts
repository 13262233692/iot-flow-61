import { EventEmitter } from 'events';
import { FlowDefinition, FlowStatus, EdgeSnapshots, NodeSnapshots } from '../types';
export interface FlowLogEntry {
    flowId: string;
    nodeId: string;
    level: 'info' | 'warn' | 'error';
    message: string;
    timestamp: number;
}
export declare class FlowRuntime extends EventEmitter {
    private flows;
    private runningFlows;
    private logs;
    private maxLogs;
    private debugStates;
    registerFlow(flow: FlowDefinition): void;
    unregisterFlow(flowId: string): boolean;
    getFlow(flowId: string): FlowDefinition | undefined;
    getAllFlows(): FlowDefinition[];
    startFlow(flowId: string): void;
    private createNodeContext;
    private initializeSourceNodes;
    private sendMessage;
    private handleNodeError;
    stopFlow(flowId: string): void;
    isFlowRunning(flowId: string): boolean;
    getFlowStatus(flowId: string): FlowStatus | undefined;
    private addLog;
    getLogs(flowId?: string, nodeId?: string): FlowLogEntry[];
    injectMessage(flowId: string, nodeId: string, payload: any): void;
    enableDebug(flowId: string): void;
    disableDebug(flowId: string): void;
    isDebugEnabled(flowId: string): boolean;
    private captureSnapshot;
    private sanitizeMessage;
    getEdgeSnapshots(flowId: string, edgeId?: string): EdgeSnapshots[];
    getNodeSnapshots(flowId: string, nodeId?: string): NodeSnapshots[];
    clearSnapshots(flowId: string): void;
    dryRun(flowId: string, startNodeId: string, payload: any): NodeSnapshots[];
}
export declare const flowRuntime: FlowRuntime;
