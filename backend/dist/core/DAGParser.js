"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dagParser = exports.DAGParser = void 0;
class DAGParser {
    parse(flow) {
        const nodeMap = new Map();
        flow.nodes.forEach(node => nodeMap.set(node.id, node));
        const parsedNodes = new Map();
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
                const sourceParsed = parsedNodes.get(edge.source);
                const targetParsed = parsedNodes.get(edge.target);
                sourceParsed.outgoing.push({ edge, targetNode });
                targetParsed.incoming.push({ edge, sourceNode });
            }
        });
        const { order: topoOrder, hasCycle, cyclePath } = this.topologicalSort(parsedNodes);
        const sourceNodes = flow.nodes
            .filter(n => parsedNodes.get(n.id).incoming.length === 0)
            .map(n => n.id);
        const sinkNodes = flow.nodes
            .filter(n => parsedNodes.get(n.id).outgoing.length === 0)
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
    topologicalSort(nodes) {
        const inDegree = new Map();
        const queue = [];
        const result = [];
        nodes.forEach((parsed, id) => {
            inDegree.set(id, parsed.incoming.length);
            if (parsed.incoming.length === 0) {
                queue.push(id);
            }
        });
        let visitedCount = 0;
        while (queue.length > 0) {
            const nodeId = queue.shift();
            result.push(nodeId);
            visitedCount++;
            const parsed = nodes.get(nodeId);
            parsed.outgoing.forEach(({ targetNode }) => {
                const newDegree = (inDegree.get(targetNode.id) || 0) - 1;
                inDegree.set(targetNode.id, newDegree);
                if (newDegree === 0) {
                    queue.push(targetNode.id);
                }
            });
        }
        const hasCycle = visitedCount !== nodes.size;
        let cyclePath;
        if (hasCycle) {
            cyclePath = this.findCyclePath(nodes);
        }
        return {
            order: result,
            hasCycle,
            cyclePath
        };
    }
    findCyclePath(nodes) {
        const visited = new Set();
        const recStack = new Set();
        const path = [];
        for (const nodeId of nodes.keys()) {
            const result = this.dfsFindCycle(nodeId, nodes, visited, recStack, path);
            if (result) {
                return result;
            }
        }
        return undefined;
    }
    dfsFindCycle(nodeId, nodes, visited, recStack, path) {
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
    validate(flow) {
        const errors = [];
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
exports.DAGParser = DAGParser;
exports.dagParser = new DAGParser();
