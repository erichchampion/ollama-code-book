interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;         // JSON string
  };
}