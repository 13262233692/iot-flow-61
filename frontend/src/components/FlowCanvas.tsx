import React, { useCallback, useRef, useEffect } from 'react';
import ReactFlow, {
  ReactFlowProvider,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  BackgroundVariant,
  Connection,
  Edge,
  Node,
  useReactFlow,
  MarkerType
} from 'reactflow';
import { v4 as uuidv4 } from 'uuid';
import { useFlowStore } from '../store/flowStore';
import { NodeDefinition, FlowNode, FlowEdge } from '../types';
import CustomNode from './CustomNode';

const nodeTypes = {
  custom: CustomNode
};

interface FlowCanvasContentProps {
  nodeDefinitions: NodeDefinition[];
}

const FlowCanvasContent: React.FC<FlowCanvasContentProps> = ({ nodeDefinitions }) => {
  const currentFlow = useFlowStore((state) => state.getCurrentFlow());
  const flowStatus = useFlowStore((state) => state.flowStatus);
  const addNode = useFlowStore((state) => state.addNode);
  const addEdge = useFlowStore((state) => state.addEdge);
  const deleteNode = useFlowStore((state) => state.deleteNode);
  const deleteEdge = useFlowStore((state) => state.deleteEdge);
  const updateNode = useFlowStore((state) => state.updateNode);
  const setSelectedNode = useFlowStore((state) => state.setSelectedNode);
  const setSelectedEdge = useFlowStore((state) => state.setSelectedEdge);
  const selectedNodeId = useFlowStore((state) => state.selectedNodeId);
  const selectedEdgeId = useFlowStore((state) => state.selectedEdgeId);
  const debugEnabled = useFlowStore((state) => state.debugEnabled);
  const edgeSnapshots = useFlowStore((state) => state.edgeSnapshots);

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition } = useReactFlow();

  useEffect(() => {
    if (currentFlow) {
      const flowNodes: Node[] = currentFlow.nodes.map((node) => {
        const nodeDef = nodeDefinitions.find((n) => n.type === node.type);
        const status = flowStatus?.nodeStatuses[node.id]?.status;
        const error = flowStatus?.nodeStatuses[node.id]?.error;
        
        return {
          id: node.id,
          type: 'custom',
          position: node.position || { x: 0, y: 0 },
          data: {
            label: node.label,
            icon: nodeDef?.icon || '📦',
            type: node.type,
            status,
            error
          },
          selected: node.id === selectedNodeId
        };
      });

      const flowEdges: Edge[] = currentFlow.edges.map((edge) => {
        const snapshotData = edgeSnapshots.find(s => s.edgeId === edge.id);
        const hasData = snapshotData && snapshotData.totalMessages > 0;
        const isSelected = edge.id === selectedEdgeId;

        return {
          id: edge.id,
          source: edge.source,
          target: edge.target,
          animated: isSelected || (debugEnabled && hasData),
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: isSelected ? '#3b82f6' : (debugEnabled && hasData ? '#10b981' : '#94a3b8')
          },
          style: {
            stroke: isSelected ? '#3b82f6' : (debugEnabled && hasData ? '#10b981' : '#94a3b8'),
            strokeWidth: isSelected ? 3 : (debugEnabled && hasData ? 2.5 : 2)
          },
          label: debugEnabled && hasData ? `${snapshotData.totalMessages}` : undefined,
          labelStyle: {
            fill: isSelected ? '#3b82f6' : '#10b981',
            fontWeight: 600,
            fontSize: 10
          },
          labelBgStyle: {
            fill: '#fff',
            fillOpacity: 0.9
          },
          labelBgPadding: [4, 2] as [number, number],
          labelBgBorderRadius: 3,
          data: { edgeId: edge.id }
        };
      });

      setNodes(flowNodes);
      setEdges(flowEdges);
    } else {
      setNodes([]);
      setEdges([]);
    }
  }, [currentFlow, flowStatus, selectedNodeId, selectedEdgeId, nodeDefinitions, setNodes, setEdges, debugEnabled, edgeSnapshots]);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const data = event.dataTransfer.getData('application/reactflow');
      if (!data || !currentFlow) return;

      const nodeDef: NodeDefinition = JSON.parse(data);
      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY
      });

      const newNode: FlowNode = {
        id: uuidv4(),
        type: nodeDef.type,
        label: nodeDef.label,
        config: { ...nodeDef.defaultConfig },
        position
      };

      addNode(newNode);
    },
    [screenToFlowPosition, currentFlow, addNode]
  );

  const onConnect = useCallback(
    (params: Connection) => {
      if (!currentFlow || !params.source || !params.target) return;

      const newEdge: FlowEdge = {
        id: uuidv4(),
        source: params.source,
        target: params.target
      };

      const result = addEdge(newEdge);
      if (!result.success) {
        return;
      }
    },
    [currentFlow, addEdge]
  );

  const onNodeDragStop = useCallback(
    (_: React.MouseEvent, node: Node) => {
      updateNode(node.id, { position: node.position });
    },
    [updateNode]
  );

  const onNodesDelete = useCallback(
    (deleted: Node[]) => {
      deleted.forEach((node) => deleteNode(node.id));
    },
    [deleteNode]
  );

  const onEdgesDelete = useCallback(
    (deleted: Edge[]) => {
      deleted.forEach((edge) => deleteEdge(edge.id));
    },
    [deleteEdge]
  );

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      setSelectedNode(node.id);
    },
    [setSelectedNode]
  );

  const onEdgeClick = useCallback(
    (_: React.MouseEvent, edge: Edge) => {
      setSelectedEdge(edge.id);
    },
    [setSelectedEdge]
  );

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
    setSelectedEdge(null);
  }, [setSelectedNode, setSelectedEdge]);

  if (!currentFlow) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-100">
        <div className="text-center text-gray-500">
          <p className="text-lg">请选择或创建一个数据流</p>
          <p className="text-sm mt-2">从左侧面板选择或创建新的数据流</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 h-full" ref={reactFlowWrapper}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onInit={() => {}}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onNodeDragStop={onNodeDragStop}
        onNodesDelete={onNodesDelete}
        onEdgesDelete={onEdgesDelete}
        onNodeClick={onNodeClick}
        onEdgeClick={onEdgeClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        fitView
        snapToGrid
        snapGrid={[15, 15]}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#e5e7eb" />
        <Controls />
      </ReactFlow>
    </div>
  );
};

const FlowCanvas: React.FC = () => {
  const nodeDefinitions = useFlowStore((state) => state.nodes);

  return (
    <ReactFlowProvider>
      <FlowCanvasContent nodeDefinitions={nodeDefinitions} />
    </ReactFlowProvider>
  );
};

export default FlowCanvas;
