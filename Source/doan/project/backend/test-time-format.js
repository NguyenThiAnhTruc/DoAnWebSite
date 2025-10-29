// Test SQL Server TIME validation
const sql = require('mssql');

const config = {
    user: 'sa',
    password: '123',
    server: 'localhost',
    database: 'SchoolEventManagement',
    options: {
        encrypt: false,
        trustServerCertificate: true,
        enableArithAbort: true
    }
};

async function testTimeFormat() {
    try {
        await sql.connect(config);
        console.log('✅ Connected to database\n');

        const testCases = [
            { value: '14:30:00', desc: 'HH:MM:SS with leading zeros' },
            { value: '14:30', desc: 'HH:MM without seconds' },
            { value: '1:30:00', desc: 'H:MM:SS (single digit hour)' },
            { value: new Date('2025-10-20T14:30:00'), desc: 'JavaScript Date object' },
            { value: '14:30:00.0000000', desc: 'With microseconds' },
        ];

        for (const test of testCases) {
            console.log(`Testing: ${test.desc}`);
            console.log(`Value: ${test.value}, Type: ${typeof test.value}`);
            
            try {
                const request = new sql.Request();
                request.input('test_time', sql.Time, test.value);
                
                const result = await request.query('SELECT @test_time AS time_value');
                console.log(`✅ SUCCESS - Stored as: ${result.recordset[0].time_value}`);
            } catch (err) {
                console.log(`❌ FAILED - ${err.message}`);
            }
            console.log('---\n');
        }

        await sql.close();
    } catch (err) {
        console.error('Error:', err);
    }
}

testTimeFormat();
