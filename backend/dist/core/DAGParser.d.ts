import { FlowDefinition, FlowNode, FlowEdge } from '../types';
export interface ParsedNode {
    node: FlowNode;
    incoming: {
        edge: FlowEdge;
        sourceNode: FlowNode;
    }[];
    outgoing: {
        edge: FlowEdge;
        targetNode: FlowNode;
    }[];
}
export interface ParsedDAG {
    nodes: Map<string, ParsedNode>;
    sourceNodes: string[];
    sinkNodes: string[];
    topoOrder: string[];
    hasCycle: boolean;
    cyclePath?: string[];
}
export declare class DAGParser {
    parse(flow: FlowDefinition): ParsedDAG;
    private topologicalSort;
    private findCyclePath;
    private dfsFindCycle;
    validate(flow: FlowDefinition): {
        valid: boolean;
        errors: string[];
        cyclePath?: string[];
    };
}
export declare const dagParser: DAGParser;
