class PluginError extends Error {
  constructor(
    message: string,
    public code: PluginErrorCode,
    public pluginId: string
  );
}

type PluginErrorCode =
  | 'ACTIVATION_ERROR'
  | 'DEACTIVATION_ERROR'
  | 'DEPENDENCY_ERROR'
  | 'VERSION_MISMATCH'
  | 'INVALID_PLUGIN';