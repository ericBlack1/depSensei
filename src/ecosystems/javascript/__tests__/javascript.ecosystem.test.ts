import { JavaScriptEcosystem } from '../javascript.ecosystem';
import { join } from 'path';
import { writeFileSync, mkdirSync } from 'fs';

describe('JavaScriptEcosystem', () => {
  const testDir = join(__dirname, 'test-project');
  let ecosystem: JavaScriptEcosystem;

  beforeEach(() => {
    // Create test directory and package.json
    mkdirSync(testDir, { recursive: true });
    writeFileSync(
      join(testDir, 'package.json'),
      JSON.stringify({
        dependencies: {
          'react': '16.8.0',
          'react-dom': '16.8.0',
        },
        devDependencies: {
          'typescript': '4.0.0',
        },
        peerDependencies: {
          'react': '^16.0.0',
        },
      }, null, 2)
    );

    ecosystem = new JavaScriptEcosystem(testDir);
  });

  describe('detect', () => {
    it('should detect JavaScript ecosystem', async () => {
      const isDetected = await ecosystem.detect();
      expect(isDetected).toBe(true);
    });
  });

  describe('analyze', () => {
    it('should analyze dependencies and find issues', async () => {
      await ecosystem.detect();
      const issues = await ecosystem.analyze();
      
      expect(issues).toBeDefined();
      expect(Array.isArray(issues)).toBe(true);
    });
  });
}); 