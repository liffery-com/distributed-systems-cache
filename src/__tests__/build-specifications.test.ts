import * as fs from 'fs';
import * as path from 'path';

// Helper function to safely read and parse JSON
const readJsonFile = (filePath: string): any => {
  try {
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(fileContent);
  } catch (error: any) {
    throw new Error(`Failed to read or parse JSON file at ${filePath}: ${error.message}`);
  }
};

// Helper function to normalize directory paths (remove leading './' and trailing '/')
const normalizeDir = (dirPath: string): string => {
  let normalized = dirPath.replace(/^\.\//, ''); // Remove leading './'
  if (normalized.endsWith('/')) {
    normalized = normalized.slice(0, -1); // Remove trailing '/'
  }
  return normalized;
};

describe('Project Configuration Files', () => {
  let packageJson: any;
  let tsconfigJson: any;
  const projectRoot = path.resolve(__dirname, '..'); // Adjust '..' if tests are nested deeper

  beforeAll(() => {
    // Read files once before tests in this suite run
    const packageJsonPath = path.join(projectRoot, 'package.json');
    const tsconfigJsonPath = path.join(projectRoot, 'tsconfig.json');

    packageJson = readJsonFile(packageJsonPath);
    tsconfigJson = readJsonFile(tsconfigJsonPath);
    if (!packageJson) {
      throw new Error('package.json could not be read.');
    }
    if (!tsconfigJson) {
      throw new Error('tsconfig.json could not be read.');
    }
    if (!packageJson.main) {
      throw new Error('`main` field missing in package.json');
    }
    if (!packageJson.types) {
      throw new Error('`types` field missing in package.json');
    }
    if (!tsconfigJson.compilerOptions?.outDir) {
      throw new Error('`compilerOptions.outDir` missing in tsconfig.json');
    }
  });

  it('should have tsconfig.json outDir matching package.json main/types directory', () => {
    const expectedOutDir = normalizeDir(tsconfigJson.compilerOptions.outDir);
    const mainDir = normalizeDir(path.dirname(packageJson.main));
    const typesDir = normalizeDir(path.dirname(packageJson.types));
    expect(mainDir).toBe(expectedOutDir);
    expect(typesDir).toBe(expectedOutDir);
  });

  // Optional: Explicitly check the values from the example
  it('should have the specific expected paths from the example', () => {
    const expectedOutDir = 'dist'; // Based on './dist/...'
    const packageMain = './dist/index.js';
    const packageTypes = './dist/index.d.ts';

    expect(normalizeDir(tsconfigJson.compilerOptions.outDir)).toBe(expectedOutDir);
    expect(packageJson.main).toBe(packageMain);
    expect(packageJson.types).toBe(packageTypes);
  });
});
