import fetch from 'node-fetch';

async function testUpdate() {
  try {
    // First login to get a token
    console.log('Logging in...');
    const loginResponse = await fetch('http://localhost:4000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'password123'
      })
    });
    
    const loginData = await loginResponse.json();
    console.log('Login response:', loginData);
    
    if (loginData.token) {
      // Test updating a GiftCardType
      console.log('Testing GiftCardType update...');
      const updateResponse = await fetch('http://localhost:4000/api/entities/GiftCardType/1', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${loginData.token}`
        },
        body: JSON.stringify({
          color: '#ff0000'
        })
      });
      
      const updateData = await updateResponse.json();
      console.log('Update response status:', updateResponse.status);
      console.log('Update response:', updateData);
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testUpdate();
