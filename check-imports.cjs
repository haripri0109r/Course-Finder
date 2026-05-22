const fs = require('fs');
const path = require('path');

function checkImports(dir) {
  let issues = 0;
  
  function walk(currentDir) {
    const files = fs.readdirSync(currentDir);
    for (const file of files) {
      const fullPath = path.join(currentDir, file);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory() && !fullPath.includes('node_modules') && !fullPath.includes('.git') && !fullPath.includes('.expo')) {
        walk(fullPath);
      } else if (stat.isFile() && (fullPath.endsWith('.js') || fullPath.endsWith('.jsx'))) {
        const content = fs.readFileSync(fullPath, 'utf8');
        // Simple regex to grab relative imports
        const importRegex = /import\s+.*?from\s+['"]([\.\/][^'"]+)['"]/g;
        let match;
        while ((match = importRegex.exec(content)) !== null) {
          const importPath = match[1];
          // We only check relative paths ending in .js or directories
          let targetPath = path.resolve(path.dirname(fullPath), importPath);
          
          // if it doesn't end in .js, try appending it
          if (!targetPath.endsWith('.js') && !targetPath.endsWith('.jsx')) {
             if (fs.existsSync(targetPath + '.js')) targetPath += '.js';
             else if (fs.existsSync(path.join(targetPath, 'index.js'))) targetPath = path.join(targetPath, 'index.js');
          }

          if (fs.existsSync(targetPath)) {
            // Check true case by comparing with readdir
            const dirName = path.dirname(targetPath);
            const baseName = path.basename(targetPath);
            if (fs.existsSync(dirName)) {
                const actualFiles = fs.readdirSync(dirName);
                if (!actualFiles.includes(baseName)) {
                    console.log(`[CASE MISMATCH] In ${fullPath}`);
                    console.log(`  Imported as: ${importPath}`);
                    console.log(`  Actual file: ${actualFiles.find(f => f.toLowerCase() === baseName.toLowerCase()) || 'NOT FOUND'}`);
                    issues++;
                }
            }
          }
        }
      }
    }
  }
  
  walk(dir);
  return issues;
}

console.log('Checking backend imports...');
const backendIssues = checkImports(path.join(__dirname, 'backend'));
console.log('Checking frontend imports...');
const frontendIssues = checkImports(path.join(__dirname, 'frontend'));

if (backendIssues === 0 && frontendIssues === 0) {
    console.log('✅ No case-sensitive import issues found.');
} else {
    console.log(`❌ Found ${backendIssues + frontendIssues} case-sensitive import issues.`);
}
