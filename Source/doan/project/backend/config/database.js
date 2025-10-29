const sql = require('mssql');
require('dotenv').config();

const config = {
    server: process.env.DB_SERVER || 'localhost',
    database: process.env.DB_DATABASE || 'SchoolEventManagement',
    user: process.env.DB_USER || 'sa',
    password: process.env.DB_PASSWORD || '123',
    port: parseInt(process.env.DB_PORT) || 1433,
    options: {
        encrypt: process.env.DB_ENCRYPT === 'true',
        trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true',
        enableArithAbort: true,
        requestTimeout: 30000,
        connectionTimeout: 30000
    },
    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000
    }
};

class Database {
    constructor() {
        this.pool = null;
        this.useMockData = false;
    }

    async connect() {
        try {
            if (!this.pool) {
                console.log(' Attempting to connect to SQL Server...');
                this.pool = await sql.connect(config);
                console.log(' Connected to SQL Server successfully');
                
                // Test the connection with a simple query
                await this.pool.request().query('SELECT 1 as test');
                console.log(' Database connection tested successfully');
            }
            return this.pool;
        } catch (error) {
            console.error(' Database connection failed:', error.message);
            throw error;
        }
    }

    async query(text, params = []) {
        try {
            const pool = await this.connect();
            const request = pool.request();
            
            // Add parameters to request
            if (Array.isArray(params)) {
                params.forEach((param, index) => {
                    request.input(`param${index}`, param);
                });
            } else {
                Object.entries(params).forEach(([key, value]) => {
                    request.input(key, value);
                });
            }

            const result = await request.query(text);
            return result;
        } catch (err) {
            console.error(' Error executing query:', err);
            throw err;
        }
    }

    async executeProcedure(procName, params = {}) {
        try {
            const pool = await this.connect();
            const request = pool.request();
            
            console.log(`📞 executeProcedure: ${procName}`);
            console.log('📋 Parameters:', params);
            
            // Add parameters to request
            Object.entries(params).forEach(([key, value]) => {
                console.log(`  ➡️ @${key} =`, value, `(${typeof value})`);
                request.input(key, value);
            });

            const result = await request.execute(procName);
            
            console.log('📦 Result recordsets length:', result.recordsets?.length);
            if (result.recordsets && result.recordsets[0]) {
                console.log('📊 First recordset rows:', result.recordsets[0].length);
            }
            if (result.recordset) {
                console.log('📊 Result recordset rows:', result.recordset.length);
            }
            
            return result;
        } catch (err) {
            console.error('❌ Error executing stored procedure:', err);
            throw err;
        }
    }

    async close() {
        try {
            if (this.pool) {
                await this.pool.close();
                this.pool = null;
                console.log(' Database connection closed');
            }
        } catch (err) {
            console.error(' Error closing database connection:', err);
            throw err;
        }
    }

    async getEvents(filters = {}) {
        try {
            const pool = await this.connect();
            const request = pool.request();
            
            // Build dynamic query based on filters
            let whereClause = 'WHERE e.is_active = 1';
            
            if (filters.category) {
                whereClause += ' AND c.category_name = @category';
                request.input('category', filters.category);
            }
            
            if (filters.status) {
                whereClause += ' AND e.status = @status';
                request.input('status', filters.status);
            }
            
            if (filters.department) {
                whereClause += ' AND d.department_code = @department';
                request.input('department', filters.department);
            }

            const query = `
                SELECT 
                    e.event_id AS id,
                    e.title,
                    e.description,
                    e.short_description,
                    e.location,
                    e.start_date,
                    e.end_date,
                    e.max_participants,
                    e.current_participants,
                    e.price,
                    e.status,
                    e.contact_email,
                    e.contact_phone,
                    c.category_name AS category,
                    d.department_name AS department,
                    d.department_code,
                    up.first_name + ' ' + up.last_name AS organizer,
                    ei.image_url,
                    e.created_at,
                    e.updated_at
                FROM Events e
                LEFT JOIN Categories c ON e.category_id = c.category_id
                LEFT JOIN Departments d ON e.department_id = d.department_id
                LEFT JOIN Users u ON e.organizer_id = u.user_id
                LEFT JOIN UserProfiles up ON u.user_id = up.user_id
                LEFT JOIN EventImages ei ON e.event_id = ei.event_id AND ei.is_primary = 1
                ${whereClause}
                ORDER BY e.start_date ASC
            `;

            const result = await request.query(query);
            return result.recordset;
        } catch (error) {
            console.error(' Error getting events:', error);
            throw error;
        }
    }

    async getUserByCredentials(email, password) {
        try {
            const result = await this.executeProcedure('sp_AuthenticateUser', {
                email: email,
                password: password
            });
            return result.recordset[0];
        } catch (err) {
            console.error(' Error authenticating user:', err);
            throw err;
        }
    }

    async disconnect() {
        try {
            if (this.pool) {
                await this.pool.close();
                this.pool = null;
                console.log(' Database connection closed');
            }
        } catch (error) {
            console.error(' Error closing database connection:', error);
            throw error;
        }
    }
}

// Export singleton instance
const database = new Database();
module.exports = database;
