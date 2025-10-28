/**
 * Command argument types
 */
export enum ArgType {
  STRING = 'string',
  NUMBER = 'number',
  BOOLEAN = 'boolean',
  ARRAY = 'array'
}

/**
 * Command argument definition
 */
export interface CommandArgDef {
  /**
   * Argument name
   */
  name: string;

  /**
   * Argument description
   */
  description: string;

  /**
   * Argument type
   */
  type: ArgType;

  /**
   * Argument position in positional args
   */
  position?: number;

  /**
   * Whether the argument is required
   */
  required?: boolean;

  /**
   * Default value
   */
  default?: any;

  /**
   * Choices for the argument (if applicable)
   */
  choices?: string[];

  /**
   * Short flag (e.g., -v for --verbose)
   */
  shortFlag?: string;

  /**
   * Long flag (e.g., --verbose)
   */
  flag?: string;

  /**
   * Whether to hide from help
   */
  hidden?: boolean;
}