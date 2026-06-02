import { FlowDefinition, FlowNode, FlowEdge } from '../types';

export interface ParsedNode {
  node: FlowNode;
  incoming: { edge: FlowEdge; sourceNode: FlowNode }[];
  outgoing: { edge: FlowEdge; targetNode: FlowNode }[];
}

export interface ParsedDAG {
  nodes: Map<string, ParsedNode>;
  sourceNodes: string[];
  sinkNodes: string[];
  topoOrder: string[];
  hasCycle: boolean;
  cyclePath?: string[];
}

export class DAGParser {
  parse(flow: FlowDefinition): ParsedDAG {
    const nodeMap = new Map<string, FlowNode>();
    flow.nodes.forEach(node => nodeMap.set(node.id, node));

    const parsedNodes = new Map<string, ParsedNode>();
    flow.nodes.forEach(node => {
      parsedNodes.set(node.id, {
        node,
        incoming: [],
        outgoing: []
      });
    });

    flow.edges.forEach(edge => {
      const sourceNode = nodeMap.get(edge.source);
      const targetNode = nodeMap.get(edge.target);
      
      if (sourceNode && targetNode) {
        const sourceParsed = parsedNodes.get(edge.source)!;
        const targetParsed = parsedNodes.get(edge.target)!;
        
        sourceParsed.outgoing.push({ edge, targetNode });
        targetParsed.incoming.push({ edge, sourceNode });
      }
    });

    const { order: topoOrder, hasCycle, cyclePath } = this.topologicalSort(parsedNodes);
    
    const sourceNodes = flow.nodes
      .filter(n => parsedNodes.get(n.id)!.incoming.length === 0)
      .map(n => n.id);
    
    const sinkNodes = flow.nodes
      .filter(n => parsedNodes.get(n.id)!.outgoing.length === 0)
      .map(n => n.id);

    return {
      nodes: parsedNodes,
      sourceNodes,
      sinkNodes,
      topoOrder,
      hasCycle,
      cyclePath
    };
  }

  private topologicalSort(nodes: Map<string, ParsedNode>): { order: string[]; hasCycle: boolean; cyclePath?: string[] } {
    const inDegree = new Map<string, number>();
    const queue: string[] = [];
    const result: string[] = [];

    nodes.forEach((parsed, id) => {
      inDegree.set(id, parsed.incoming.length);
      if (parsed.incoming.length === 0) {
        queue.push(id);
      }
    });

    let visitedCount = 0;
    
    while (queue.length > 0) {
      const nodeId = queue.shift()!;
      result.push(nodeId);
      visitedCount++;

      const parsed = nodes.get(nodeId)!;
      parsed.outgoing.forEach(({ targetNode }) => {
        const newDegree = (inDegree.get(targetNode.id) || 0) - 1;
        inDegree.set(targetNode.id, newDegree);
        if (newDegree === 0) {
          queue.push(targetNode.id);
        }
      });
    }

    const hasCycle = visitedCount !== nodes.size;
    let cyclePath: string[] | undefined;

    if (hasCycle) {
      cyclePath = this.findCyclePath(nodes);
    }

    return {
      order: result,
      hasCycle,
      cyclePath
    };
  }

  private findCyclePath(nodes: Map<string, ParsedNode>): string[] | undefined {
    const visited = new Set<string>();
    const recStack = new Set<string>();
    const path: string[] = [];

    for (const nodeId of nodes.keys()) {
      const result = this.dfsFindCycle(nodeId, nodes, visited, recStack, path);
      if (result) {
        return result;
      }
    }

    return undefined;
  }

  private dfsFindCycle(
    nodeId: string,
    nodes: Map<string, ParsedNode>,
    visited: Set<string>,
    recStack: Set<string>,
    path: string[]
  ): string[] | undefined {
    if (recStack.has(nodeId)) {
      const cycleStart = path.indexOf(nodeId);
      return [...path.slice(cycleStart), nodeId];
    }

    if (visited.has(nodeId)) {
      return undefined;
    }

    visited.add(nodeId);
    recStack.add(nodeId);
    path.push(nodeId);

    const parsed = nodes.get(nodeId);
    if (parsed) {
      for (const { targetNode } of parsed.outgoing) {
        const result = this.dfsFindCycle(targetNode.id, nodes, visited, recStack, path);
        if (result) {
          return result;
        }
      }
    }

    path.pop();
    recStack.delete(nodeId);
    return undefined;
  }

  validate(flow: FlowDefinition): { valid: boolean; errors: string[]; cyclePath?: string[] } {
    const errors: string[] = [];
    const nodeIds = new Set(flow.nodes.map(n => n.id));

    flow.edges.forEach(edge => {
      if (!nodeIds.has(edge.source)) {
        errors.push(`Edge ${edge.id} references unknown source node ${edge.source}`);
      }
      if (!nodeIds.has(edge.target)) {
        errors.push(`Edge ${edge.id} references unknown target node ${edge.target}`);
      }
    });

    const parsed = this.parse(flow);
    if (parsed.hasCycle) {
      const cycleInfo = parsed.cyclePath 
        ? ` (cycle path: ${parsed.cyclePath.join(' -> ')})`
        : '';
      errors.push(`Flow contains cycles, which are not allowed${cycleInfo}`);
    }

    return {
      valid: errors.length === 0,
      errors,
      cyclePath: parsed.cyclePath
    };
  }
}

export const dagParser = new DAGParser();
