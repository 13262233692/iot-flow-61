import { FlowEdge } from '../types';

export function wouldCreateCycle(
  edges: FlowEdge[],
  newSource: string,
  newTarget: string
): boolean {
  if (newSource === newTarget) return true;

  const adjacency = new Map<string, Set<string>>();
  edges.forEach(edge => {
    if (!adjacency.has(edge.source)) {
      adjacency.set(edge.source, new Set());
    }
    adjacency.get(edge.source)!.add(edge.target);
  });

  if (!adjacency.has(newSource)) {
    adjacency.set(newSource, new Set());
  }
  adjacency.get(newSource)!.add(newTarget);

  return hasCycle(adjacency);
}

export function hasCycle(adjacency: Map<string, Set<string>>): boolean {
  const visited = new Set<string>();
  const inStack = new Set<string>();

  for (const node of adjacency.keys()) {
    if (dfsDetect(node, adjacency, visited, inStack)) {
      return true;
    }
  }
  return false;
}

function dfsDetect(
  node: string,
  adjacency: Map<string, Set<string>>,
  visited: Set<string>,
  inStack: Set<string>
): boolean {
  if (inStack.has(node)) return true;
  if (visited.has(node)) return false;

  visited.add(node);
  inStack.add(node);

  const neighbors = adjacency.get(node);
  if (neighbors) {
    for (const neighbor of neighbors) {
      if (dfsDetect(neighbor, adjacency, visited, inStack)) {
        return true;
      }
    }
  }

  inStack.delete(node);
  return false;
}

export function findCyclePath(
  edges: FlowEdge[],
  newSource: string,
  newTarget: string
): string[] | null {
  const adjacency = new Map<string, Set<string>>();
  edges.forEach(edge => {
    if (!adjacency.has(edge.source)) {
      adjacency.set(edge.source, new Set());
    }
    adjacency.get(edge.source)!.add(edge.target);
  });

  if (!adjacency.has(newSource)) {
    adjacency.set(newSource, new Set());
  }
  adjacency.get(newSource)!.add(newTarget);

  const visited = new Set<string>();
  const path: string[] = [];

  function dfs(node: string): string[] | null {
    if (path.includes(node)) {
      const cycleStart = path.indexOf(node);
      return [...path.slice(cycleStart), node];
    }

    if (visited.has(node)) return null;
    visited.add(node);
    path.push(node);

    const neighbors = adjacency.get(node);
    if (neighbors) {
      for (const neighbor of neighbors) {
        const result = dfs(neighbor);
        if (result) return result;
      }
    }

    path.pop();
    return null;
  }

  return dfs(newSource);
}
