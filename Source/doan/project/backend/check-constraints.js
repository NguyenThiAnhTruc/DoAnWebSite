const database = require('./config/database');

async function checkConstraints() {
    try {
        await database.connect();
        console.log('✅ Database connected successfully');
        
        // Check the constraint definition
        const constraint = await database.query(`
            SELECT 
                cc.CONSTRAINT_NAME,
                cc.CHECK_CLAUSE
            FROM INFORMATION_SCHEMA.CHECK_CONSTRAINTS cc
            WHERE cc.CONSTRAINT_NAME LIKE '%check%' 
            AND cc.CONSTRAINT_NAME LIKE '%08B54D69%'
        `);
        
        console.log('🔒 Check Constraint Details:');
        constraint.recordset.forEach(c => {
            console.log(`  - Name: ${c.CONSTRAINT_NAME}`);
            console.log(`  - Clause: ${c.CHECK_CLAUSE}`);
        });
        
        // Also check all constraints on EventAttendance table
        const allConstraints = await database.query(`
            SELECT 
                cc.CONSTRAINT_NAME,
                cc.CHECK_CLAUSE,
                ccu.COLUMN_NAME
            FROM INFORMATION_SCHEMA.CHECK_CONSTRAINTS cc
            JOIN INFORMATION_SCHEMA.CONSTRAINT_COLUMN_USAGE ccu ON cc.CONSTRAINT_NAME = ccu.CONSTRAINT_NAME
            WHERE ccu.TABLE_NAME = 'EventAttendance'
        `);
        
        console.log('\n📋 All EventAttendance Constraints:');
        allConstraints.recordset.forEach(c => {
            console.log(`  - Column: ${c.COLUMN_NAME}`);
            console.log(`    Constraint: ${c.CONSTRAINT_NAME}`);
            console.log(`    Clause: ${c.CHECK_CLAUSE}`);
            console.log('');
        });
        
        // Check table structure
        const columns = await database.query(`
            SELECT 
                COLUMN_NAME,
                DATA_TYPE,
                IS_NULLABLE,
                COLUMN_DEFAULT
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = 'EventAttendance'
            ORDER BY ORDINAL_POSITION
        `);
        
        console.log('📊 EventAttendance Table Structure:');
        columns.recordset.forEach(col => {
            console.log(`  - ${col.COLUMN_NAME}: ${col.DATA_TYPE} ${col.IS_NULLABLE === 'NO' ? '(NOT NULL)' : '(NULL)'} ${col.COLUMN_DEFAULT ? `DEFAULT ${col.COLUMN_DEFAULT}` : ''}`);
        });
        
    } catch (error) {
        console.error('❌ Error checking constraints:', error);
    } finally {
        process.exit(0);
    }
}

checkConstraints();