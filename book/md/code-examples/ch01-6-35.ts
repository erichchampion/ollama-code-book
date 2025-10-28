// Public API
export { Container } from './container';
export { globalContainer, initializeServices } from './services';
export { loadConfig } from './config';

// Types
export type {
  ServiceDefinition,
  ServiceRegistry,
  AppConfig
} from './types';