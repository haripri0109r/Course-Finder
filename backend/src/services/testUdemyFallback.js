// Test file for Udemy smart fallback title generation
// Run with: node backend/src/services/testUdemyFallback.js

const TECH_TERM_MAP = {
  javascript: 'JavaScript',
  typescript: 'TypeScript',
  nodejs: 'Node.js',
  'node-js': 'Node.js',
  mongodb: 'MongoDB',
  graphql: 'GraphQL',
  'machine-learning': 'Machine Learning',
  'deep-learning': 'Deep Learning',
  js: 'JavaScript',
  ts: 'TypeScript',
  react: 'React',
  node: 'Node.js',
  python: 'Python',
  sql: 'SQL',
  aws: 'AWS',
  html: 'HTML',
  css: 'CSS',
  php: 'PHP',
  java: 'Java',
  cpp: 'C++',
  csharp: 'C#',
  go: 'Go',
  rust: 'Rust',
  swift: 'Swift',
  kotlin: 'Kotlin',
  ruby: 'Ruby',
  vue: 'Vue',
  angular: 'Angular',
  docker: 'Docker',
  kubernetes: 'Kubernetes',
  rest: 'REST',
  api: 'API',
  ai: 'AI',
  ml: 'Machine Learning',
  dl: 'Deep Learning',
  nlp: 'NLP',
};

const extractUdemySlug = (url = '') => {
  try {
    const parsed = new URL(String(url));
    const path = parsed.pathname.toLowerCase();
    // Format: /course/course-name/ or /course/course-name
    const match = path.match(/^\/course\/([a-z0-9\-]+)/);
    return match?.[1] || '';
  } catch {
    return '';
  }
};

const generateTitleFromSlug = (slug = '') => {
  if (!slug) return '';
  
  // Split by hyphen and process each word
  const words = slug.split('-').filter(Boolean);
  
  const titleWords = [];
  let i = 0;
  
  while (i < words.length) {
    let foundTerm = false;
    
    // Try to find matching tech terms (greedy: check combinations first)
    for (let len = Math.min(3, words.length - i); len >= 1; len--) {
      if (i + len <= words.length) {
        const candidate = words.slice(i, i + len).join('-').toLowerCase();
        if (TECH_TERM_MAP[candidate]) {
          titleWords.push(TECH_TERM_MAP[candidate]);
          i += len;
          foundTerm = true;
          break;
        }
      }
    }
    
    if (!foundTerm) {
      // Not a tech term, capitalize normally
      titleWords.push(words[i].charAt(0).toUpperCase() + words[i].slice(1));
      i++;
    }
  }
  
  return titleWords.join(' ');
};

// Test cases
const testCases = [
  {
    url: 'https://www.udemy.com/course/javascript-fundamentals/',
    expectedSlug: 'javascript-fundamentals',
    expectedTitle: 'JavaScript Fundamentals',
  },
  {
    url: 'https://www.udemy.com/course/python-for-beginners',
    expectedSlug: 'python-for-beginners',
    expectedTitle: 'Python For Beginners',
  },
  {
    url: 'https://www.udemy.com/course/react-js-complete-guide/',
    expectedSlug: 'react-js-complete-guide',
    expectedTitle: 'React JavaScript Complete Guide',
  },
  {
    url: 'https://www.udemy.com/course/node-js-and-mongodb-comprehensive',
    expectedSlug: 'node-js-and-mongodb-comprehensive',
    expectedTitle: 'Node.js And MongoDB Comprehensive',
  },
  {
    url: 'https://www.udemy.com/course/aws-solutions-architect/',
    expectedSlug: 'aws-solutions-architect',
    expectedTitle: 'AWS Solutions Architect',
  },
  {
    url: 'https://www.udemy.com/course/docker-kubernetes-complete',
    expectedSlug: 'docker-kubernetes-complete',
    expectedTitle: 'Docker Kubernetes Complete',
  },
  {
    url: 'https://www.udemy.com/course/full-stack-web-development-with-ts/',
    expectedSlug: 'full-stack-web-development-with-ts',
    expectedTitle: 'Full Stack Web Development With TypeScript',
  },
  {
    url: 'https://www.udemy.com/course/ai-and-ml-fundamentals',
    expectedSlug: 'ai-and-ml-fundamentals',
    expectedTitle: 'AI And Machine Learning Fundamentals',
  },
];

console.log('🧪 Testing Udemy Smart Fallback Title Generation\n');
console.log('=' .repeat(80));

let passed = 0;
let failed = 0;

testCases.forEach((test, idx) => {
  const slug = extractUdemySlug(test.url);
  const title = generateTitleFromSlug(slug);
  
  const slugMatch = slug === test.expectedSlug;
  const titleMatch = title === test.expectedTitle;
  const success = slugMatch && titleMatch;
  
  if (success) {
    passed++;
    console.log(`\n✅ Test ${idx + 1}: PASSED`);
  } else {
    failed++;
    console.log(`\n❌ Test ${idx + 1}: FAILED`);
  }
  
  console.log(`URL: ${test.url}`);
  console.log(`Extracted slug: "${slug}" ${slugMatch ? '✓' : `✗ (expected: "${test.expectedSlug}")`}`);
  console.log(`Generated title: "${title}" ${titleMatch ? '✓' : `✗ (expected: "${test.expectedTitle}")`}`);
});

console.log('\n' + '='.repeat(80));
console.log(`\n📊 Results: ${passed} passed, ${failed} failed out of ${testCases.length} tests\n`);

process.exit(failed > 0 ? 1 : 0);
