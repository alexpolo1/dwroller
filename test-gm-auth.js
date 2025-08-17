// Quick test to verify GM authentication logic
const testGMAuth = () => {
  console.log('Testing GM Authentication Logic:');
  
  // Test cases
  const testCases = [
    { authedPlayer: 'gm', expected: true },
    { authedPlayer: 'anders', expected: false },
    { authedPlayer: 'andreas', expected: false },
    { authedPlayer: '', expected: false },
    { authedPlayer: null, expected: false },
    { authedPlayer: undefined, expected: false },
  ];
  
  testCases.forEach(({ authedPlayer, expected }) => {
    const isGM = authedPlayer === 'gm';
    const result = isGM === expected ? '✅ PASS' : '❌ FAIL';
    console.log(`${result} authedPlayer: '${authedPlayer}' → isGM: ${isGM} (expected: ${expected})`);
  });
};

testGMAuth();
