const express = require('express');
const cors = require('cors');

// Quick test server to debug auth issues
const app = express();

app.use(express.json());
app.use(cors());

// Test the login endpoint
async function testLogin() {
    try {
        console.log('Testing login endpoint...');
        
        const response = await fetch('http://localhost:3000/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: 'student1@school.edu.vn',
                password: 'password123'
            })
        });

        console.log('Response status:', response.status);
        
        if (response.ok) {
            const data = await response.json();
            console.log('Login successful:', data);
            return data;
        } else {
            const errorData = await response.text();
            console.log('Login failed:', errorData);
        }
    } catch (error) {
        console.error('Login test error:', error);
    }
}

// Test attendance endpoint
async function testCheckin(token, eventId, userId) {
    try {
        console.log('Testing checkin endpoint...');
        
        const response = await fetch('http://localhost:3000/api/attendance/checkin', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                event_id: eventId,
                user_id: userId,
                check_in_method: 'qr_code'
            })
        });

        console.log('Checkin response status:', response.status);
        
        if (response.ok) {
            const data = await response.json();
            console.log('Checkin successful:', data);
        } else {
            const errorData = await response.text();
            console.log('Checkin failed:', errorData);
        }
    } catch (error) {
        console.error('Checkin test error:', error);
    }
}

// Run tests
setTimeout(async () => {
    const loginData = await testLogin();
    if (loginData && loginData.token) {
        await testCheckin(loginData.token, 10, loginData.user.user_id);
    }
}, 2000);

console.log('Auth test script running...');