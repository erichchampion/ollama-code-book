// Separate tools for separate concerns
class ReadFileTool implements Tool {
  name = 'read_file';
  async execute(params) {
    return await fs.readFile(params.path, 'utf-8');
  }
}

class WriteFileTool implements Tool {
  name = 'write_file';
  async execute(params) {
    await fs.writeFile(params.path, params.content);
  }
}

class EditFileTool implements Tool {
  name = 'edit_file';
  async execute(params) {
    // Uses read_file and write_file internally
  }
}