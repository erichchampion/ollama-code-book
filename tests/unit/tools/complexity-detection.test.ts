/**
 * Unit Tests for Complexity Detection
 *
 * TDD Phase: RED - Tests written before implementation
 * These tests define the expected behavior of complexity detection heuristics.
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { detectComplexity, shouldSuggestPlanning } from '../../../src/tools/complexity-detection.js';

describe('Complexity Detection', () => {
  describe('detectComplexity', () => {
    it('should detect complex multi-file requests', () => {
      const request1 = 'Create a user authentication system with login, registration, and password reset';
      const request2 = 'Build a REST API with endpoints for users, posts, and comments';
      const request3 = 'Refactor the entire authentication module';

      expect(detectComplexity(request1).level).toBe('complex');
      expect(detectComplexity(request2).level).toBe('complex');
      expect(detectComplexity(request3).level).toBe('complex');
    });

    it('should detect architecture requests', () => {
      const request1 = 'Design the architecture for a microservices system';
      const request2 = 'Create a scalable backend architecture';
      const request3 = 'Implement a distributed system';

      expect(detectComplexity(request1).level).toBe('complex');
      expect(detectComplexity(request2).level).toBe('complex');
      expect(detectComplexity(request3).level).toBe('complex');
    });

    it('should detect multi-phase tasks', () => {
      const request1 = 'Set up the project, implement authentication, add tests, and deploy';
      const request2 = 'Create database schema, build API endpoints, write tests, and deploy to production';

      expect(detectComplexity(request1).level).toBe('complex');
      expect(detectComplexity(request2).level).toBe('complex');
    });

    it('should detect simple requests', () => {
      const request1 = 'What is JavaScript?';
      const request2 = 'Show me the contents of index.js';
      const request3 = 'Explain this function';

      expect(detectComplexity(request1).level).toBe('simple');
      expect(detectComplexity(request2).level).toBe('simple');
      expect(detectComplexity(request3).level).toBe('simple');
    });

    it('should detect moderate complexity requests', () => {
      const request1 = 'Create a login form component';
      const request2 = 'Add error handling to the API';
      const request3 = 'Implement a search feature';

      expect(detectComplexity(request1).level).toBe('moderate');
      expect(detectComplexity(request2).level).toBe('moderate');
      expect(detectComplexity(request3).level).toBe('moderate');
    });
  });

  describe('shouldSuggestPlanning', () => {
    it('should suggest planning for complex requests', () => {
      const request1 = 'Build a full-stack application with authentication';
      const request2 = 'Refactor the entire codebase';
      const request3 = 'Create a microservices architecture';

      expect(shouldSuggestPlanning(request1)).toBe(true);
      expect(shouldSuggestPlanning(request2)).toBe(true);
      expect(shouldSuggestPlanning(request3)).toBe(true);
    });

    it('should not suggest planning for simple requests', () => {
      const request1 = 'What is React?';
      const request2 = 'Show me file contents';
      const request3 = 'Explain this code';

      expect(shouldSuggestPlanning(request1)).toBe(false);
      expect(shouldSuggestPlanning(request2)).toBe(false);
      expect(shouldSuggestPlanning(request3)).toBe(false);
    });

    it('should detect multiple files/components mentioned', () => {
      const request1 = 'Create user.js, auth.js, and middleware.js';
      const request2 = 'Update the User component, AuthService, and LoginForm';
      const request3 = 'Modify api/users.ts and api/posts.ts';

      expect(shouldSuggestPlanning(request1)).toBe(true);
      expect(shouldSuggestPlanning(request2)).toBe(true);
      expect(shouldSuggestPlanning(request3)).toBe(true);
    });

    it('should detect system design keywords', () => {
      const request1 = 'Design a scalable system';
      const request2 = 'Create a distributed architecture';
      const request3 = 'Implement microservices';

      expect(shouldSuggestPlanning(request1)).toBe(true);
      expect(shouldSuggestPlanning(request2)).toBe(true);
      expect(shouldSuggestPlanning(request3)).toBe(true);
    });

    it('should detect multi-step workflow keywords', () => {
      const request1 = 'Set up project, implement features, add tests, and deploy';
      const request2 = 'Create database, build API, write tests, deploy';
      const request3 = 'First create the schema, then build endpoints, then add authentication';

      expect(shouldSuggestPlanning(request1)).toBe(true);
      expect(shouldSuggestPlanning(request2)).toBe(true);
      expect(shouldSuggestPlanning(request3)).toBe(true);
    });

    it('should not have false positives for simple multi-word requests', () => {
      const request1 = 'How do I create a user account?';
      const request2 = 'What files are in this project?';
      const request3 = 'Show me how to use the API';

      expect(shouldSuggestPlanning(request1)).toBe(false);
      expect(shouldSuggestPlanning(request2)).toBe(false);
      expect(shouldSuggestPlanning(request3)).toBe(false);
    });

    it('should detect long requests as potentially complex', () => {
      const longRequest =
        'I need to create a complete e-commerce platform with user authentication, product catalog, shopping cart, checkout process, payment integration, order management, email notifications, admin dashboard, and analytics. This should be built with React frontend, Node.js backend, PostgreSQL database, and deployed on AWS.';

      expect(shouldSuggestPlanning(longRequest)).toBe(true);
    });
  });

  describe('complexity indicators', () => {
    it('should identify file count indicators', () => {
      const request = 'Create user.js, auth.js, middleware.js, routes.js, and models.js';
      const complexity = detectComplexity(request);

      expect(complexity.indicators).toContain('multiple_files');
    });

    it('should identify architecture keywords', () => {
      const request = 'Design a microservices architecture';
      const complexity = detectComplexity(request);

      expect(complexity.indicators).toContain('architecture');
    });

    it('should identify phase keywords', () => {
      const request = 'Set up, implement, test, and deploy';
      const complexity = detectComplexity(request);

      expect(complexity.indicators).toContain('multi_phase');
    });

    it('should identify system keywords', () => {
      const request = 'Build a distributed system';
      const complexity = detectComplexity(request);

      expect(complexity.indicators).toContain('system_design');
    });
  });
});
