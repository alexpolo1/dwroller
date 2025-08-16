const axios = require('axios');

async function testRulesAPI() {
  try {
    console.log('Testing Rules API...');
    
    // Test search endpoint
    const searchResponse = await axios.get('http://localhost:5000/api/rules/search?q=combat', {
      headers: { 'x-gm-secret': 'bongo' }
    });
    
    console.log('Search results:', searchResponse.data);
    console.log('Number of results:', searchResponse.data.results ? searchResponse.data.results.length : 0);
    
    // Test stats endpoint
    const statsResponse = await axios.get('http://localhost:5000/api/rules/stats', {
      headers: { 'x-gm-secret': 'bongo' }
    });
    
    console.log('Stats:', statsResponse.data);
    
  } catch (error) {
    console.error('API Test failed:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
    }
  }
}

testRulesAPI();
