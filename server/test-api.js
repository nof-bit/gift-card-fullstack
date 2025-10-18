import fetch from 'node-fetch';

async function testAPI() {
  try {
    console.log('Testing login...');
    const response = await fetch('http://localhost:4000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'password123'
      })
    });
    
    const data = await response.json();
    console.log('Login response:', data);
    
    if (data.token) {
      console.log('Testing protected endpoint...');
      const meResponse = await fetch('http://localhost:4000/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${data.token}`
        }
      });
      
      const meData = await meResponse.json();
      console.log('Me response:', meData);
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testAPI();
