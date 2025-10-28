// One tool doing too much
class FileOperationTool implements Tool {
  name = 'file_operation';
  async execute(params) {
    if (params.operation === 'read') {
      // Read logic
    } else if (params.operation === 'write') {
      // Write logic
    } else if (params.operation === 'delete') {
      // Delete logic
    }
    // Hard to cache, approve, compose
  }
}