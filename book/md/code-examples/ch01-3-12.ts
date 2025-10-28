// src/codebase/project-context.ts
export class ProjectContext {
  async analyzeProject(projectRoot: string): Promise<ProjectInfo>;
  async getFileStructure(): Promise<DirectoryStructure>;
  async findRelevantFiles(query: string): Promise<string[]>;
  async buildCodeGraph(): Promise<CodeKnowledgeGraph>;
}