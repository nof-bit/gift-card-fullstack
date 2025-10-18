import fetch from 'node-fetch';

async function testCardCreation() {
  try {
    // First, let's login to get a token
    const loginResponse = await fetch('http://localhost:4000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'admin@giftcardapp.com',
        password: 'admin123'
      })
    });

    const loginData = await loginResponse.json();
    console.log('Login response:', loginData);

    if (!loginData.token) {
      console.error('Failed to get token');
      return;
    }

    // Now try to create a card
    const cardData = {
      card_name: 'Test Card',
      card_type: 'Test Type',
      balance: 100.50,
      expiry_date: '2025-12-31',
      vendor: 'Test Vendor'
    };

    console.log('Creating card with data:', cardData);

    const createResponse = await fetch('http://localhost:4000/api/entities/GiftCard', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${loginData.token}`
      },
      body: JSON.stringify(cardData)
    });

    const createData = await createResponse.json();
    console.log('Create response status:', createResponse.status);
    console.log('Create response data:', createData);

  } catch (error) {
    console.error('Test error:', error);
  }
}

testCardCreation();
