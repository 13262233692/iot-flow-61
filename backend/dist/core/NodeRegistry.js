"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.nodeRegistry = exports.NodeRegistry = void 0;
class NodeRegistry {
    definitions = new Map();
    handlers = new Map();
    register(definition, handler) {
        if (this.definitions.has(definition.type)) {
            throw new Error(`Node type "${definition.type}" is already registered`);
        }
        this.definitions.set(definition.type, definition);
        this.handlers.set(definition.type, handler);
    }
    unregister(type) {
        return this.definitions.delete(type) && this.handlers.delete(type);
    }
    getDefinition(type) {
        return this.definitions.get(type);
    }
    getHandler(type) {
        return this.handlers.get(type);
    }
    getAllDefinitions() {
        return Array.from(this.definitions.values());
    }
    has(type) {
        return this.definitions.has(type);
    }
    createDefaultConfig(type) {
        const def = this.getDefinition(type);
        if (!def) {
            throw new Error(`Unknown node type: ${type}`);
        }
        return { ...def.defaultConfig };
    }
}
exports.NodeRegistry = NodeRegistry;
exports.nodeRegistry = new NodeRegistry();
