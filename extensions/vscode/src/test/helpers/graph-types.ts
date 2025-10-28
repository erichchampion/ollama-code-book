/**
 * Shared Knowledge Graph Types
 * Common types and interfaces for knowledge graph tests
 */

/**
 * Node types in the knowledge graph
 */
export enum NodeType {
  FUNCTION = 'function',
  CLASS = 'class',
  VARIABLE = 'variable',
  INTERFACE = 'interface',
  MODULE = 'module',
  API_ENDPOINT = 'api_endpoint',
  DATABASE_QUERY = 'database_query',
  ERROR_HANDLER = 'error_handler',
  AUTH_CHECK = 'auth_check',
}

/**
 * Relationship types in the knowledge graph
 */
export enum RelationType {
  CALLS = 'calls',
  IMPORTS = 'imports',
  EXTENDS = 'extends',
  IMPLEMENTS = 'implements',
  USES = 'uses',
  HANDLES = 'handles',
  AUTHENTICATES = 'authenticates',
  DEPENDS_ON = 'depends_on',
  READS = 'reads',
  WRITES = 'writes',
  RETURNS = 'returns',
}

/**
 * Node metadata for different node types
 */
export interface NodeMetadata {
  description?: string;
  parameters?: string[];
  returns?: string;
  query?: string;
  catches?: string[];
  method?: string;
  path?: string;
  handler?: string;
  condition?: string;
  methods?: readonly string[];
  // Anti-pattern detection metadata
  cyclomaticComplexity?: number;
  lineCount?: number;
  className?: string;
  feature?: string;
}

/**
 * Relationship metadata
 */
export interface RelationshipMetadata {
  branch?: 'true' | 'false';
  weight?: number;
}

/**
 * Knowledge graph node
 */
export interface GraphNode {
  id: string;
  type: NodeType;
  name: string;
  filePath: string;
  lineNumber: number;
  metadata?: NodeMetadata;
  _searchText?: string; // Cache for performance
}

/**
 * Knowledge graph relationship
 */
export interface GraphRelationship {
  id: string;
  type: RelationType;
  sourceId: string;
  targetId: string;
  metadata?: RelationshipMetadata;
}

/**
 * Semantic query interface
 */
export interface SemanticQuery {
  query: string;
  constraints?: {
    nodeTypes?: NodeType[];
    filePatterns?: string[];
    minScore?: number;
  };
  limit?: number;
}

/**
 * Query result
 */
export interface QueryResult {
  node: GraphNode;
  score: number;
  matches: string[];
}

/**
 * Traversal result
 */
export interface TraversalResult {
  path: GraphNode[];
  depth: number;
  relationships: GraphRelationship[];
}

/**
 * Data flow path
 */
export interface DataFlowPath {
  variable: string;
  path: GraphNode[];
  operations: string[];
}

/**
 * Control flow path
 */
export interface ControlFlowPath {
  condition: string;
  truePath: GraphNode[];
  falsePath: GraphNode[];
}
