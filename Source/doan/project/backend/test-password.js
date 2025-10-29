const bcrypt = require('bcrypt');

async function testPassword() {
    const plainPassword = 'password123';
    const hashedPassword = '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBNTzjpKhWV/qy';
    
    console.log('Testing password:', plainPassword);
    console.log('Against hash:', hashedPassword);
    
    try {
        const isValid = await bcrypt.compare(plainPassword, hashedPassword);
        console.log('Password match result:', isValid);
        
        // Also test generating a new hash
        const newHash = await bcrypt.hash(plainPassword, 12);
        console.log('New hash for password123:', newHash);
        
        const newHashTest = await bcrypt.compare(plainPassword, newHash);
        console.log('New hash validation:', newHashTest);
        
    } catch (error) {
        console.error('Error testing password:', error);
    }
}

testPassword();