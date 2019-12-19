import pgmock from '../src/PGMock2';
import assert from 'assert';
import 'mocha';

describe('pgmock2 tests...', function() {
    describe('Test Instance', function() {
        let pgMock = new pgmock();

        it('Should create an instance object.', function() {
            assert.equal(typeof(pgMock), 'object');
        });

        it('Should have an add method.', function() {
            assert.equal(typeof(pgMock.add), 'function');
        });

        it('Should have a connect method.', function() {
            assert.equal(typeof(pgMock.connect), 'function');
        });

        it('Should have a drop method.', function() {
            assert.equal(typeof(pgMock.drop), 'function');
        });

        it('Should have a dropAll method.', function() {
            assert.equal(typeof(pgMock.dropAll), 'function');
        });

        it('Should have a toString method.', function() {
            assert.equal(typeof(pgMock.toString), 'function');
        });
    });


    describe('Test `toString` Method', function() {
        let pgMock = new pgmock();

        it('Should return a string reprenstation of the data object.', function() {
            let str = pgMock.toString();
            assert.equal(typeof(str), 'string');
            assert.equal(typeof(JSON.parse(str)), 'object');
        });
    });


    describe('Test `add` Method', function() {
        let pgMock = new pgmock();
        let len = pgMock.toString().length;
        
        pgMock.add('SELECT * FROM schema.table;', [], {
            rowCount: 1,
            rows: [
                {attrib1: 'val1', attrib2: 'val2'}
            ]
        });

        it('Should have new data in the mock database.', function() {
            assert.ok(len < pgMock.toString().length);
        });
    });


    describe('Test `drop` Method', function() {
        let pgMock = new pgmock();
        let data, queryHash, sql = 'SELECT * FROM schema.table;';
        
        pgMock.add(sql, [], {
            rowCount: 1,
            rows: [
                {attrib1: 'val1', attrib2: 'val2'}
            ]
        });

        data = JSON.parse(pgMock.toString());

        for (const query in data) {
            queryHash = query
        }

        pgMock.drop(sql);
        data = JSON.parse(pgMock.toString());

        it('Should remove the added query.', function() {
            assert.equal(data[queryHash], undefined);
        });
    });


    describe('Test `dropAll` Method', function() {
        let pgMock = new pgmock();
        let data, data2;
        
        pgMock.add('SELECT * FROM schema.table;', [], {
            rowCount: 1,
            rows: [
                {attrib1: 'val1', attrib2: 'val2'}
            ]
        });

        pgMock.dropAll();
        data = JSON.parse(pgMock.toString());

        it('Should remove the added query.', function() {
            assert.equal(Object.keys(data).length, 0);
        });
        
        pgMock.add('SELECT * FROM schema.table;', [], {
            rowCount: 1,
            rows: [
                {attrib1: 'val1', attrib2: 'val2'}
            ]
        });

        data2 = JSON.parse(pgMock.toString());

        it('Should allow a new query to be added.', function() {
            assert.equal(Object.keys(data2).length, 1);
        });
    });


    describe('Test `connect` Method', function() {
        let pgMock = new pgmock();
        let pgClient;

        it('Should return an object.', async function() {
            pgClient = await pgMock.connect();
            assert.equal(typeof(pgClient), 'object');
        });

        it('Should have a query method.', function() {
            assert.equal(typeof(pgClient.query), 'function');
        });

        it('Should have a release method.', function() {
            assert.equal(typeof(pgClient.release), 'function');
        });

        it('Should have an end method.', function() {
            assert.equal(typeof(pgClient.end), 'function');
        });
    });


    describe('Test `connect.query` Method', function() {
        let pgMock = new pgmock();
        let pgClient = pgMock.connect();
        let query = 'SELECT * FROM schema.table;';
        
        pgMock.add(query, [], {
            rowCount: 1,
            rows: [
                {attrib1: 'val1', attrib2: 'val2'}
            ]
        });

        it('Should have the values of the added item.', async function() {
            let res = await pgClient.query(query, []);
            assert.equal(res.rows[0].attrib1, 'val1');
            assert.equal(res.rows[0].attrib2, 'val2');
        });

        it('Should respond with an error if given wrong values.', async function() {
            let res;

            try {
                res = await pgClient.query(query, ['hello']);
            }
            catch(err) {
                res = err;
            }

            assert.ok(res.message.match(/invalid values/), `Expected invalid values, instead got ${res.message}`);
        });

        it('Should respond with an error if given invalid query.', async function() {
            let res;

            try {
                res = await pgClient.query('select * schema.table', []);
            }
            catch(err) {
                res = err;
            }

            assert.ok(res.message.match(/invalid query/));
        });
    });

    describe('connect.query with function validation and valid input', () => {
        const pg = new pgmock();
        const client = pg.connect();

        const validId = (id) => {
            return id > 0 && id === Number(parseInt(id));
        };

        pg.add('SELECT * FROM employees WHERE id = $1', [validId], {
            rowCount: 1,
            rows: [
                { id: 1, name: 'John Smith', position: 'application developer' }
            ]
        });

        it('Should return a valid response', async () => {
            const res = await client.query('SELECT * FROM employees WHERE id = $1', [1]);
            assert.strictEqual(res.rowCount, 1);
            assert.strictEqual(res.rows[0].id, 1);
            assert.strictEqual(res.rows[0].name, 'John Smith');
        });
    });

    describe('connect.query with function validation and invalid input', () => {
        const pg = new pgmock();
        const client = pg.connect();

        const validId = (id: any) => {
            return typeof(id) === 'number' && isFinite(id) && id > 0 && id === Number(id.toFixed(0));
        };

        pg.add('SELECT * FROM employees WHERE id = $1', [validId], {
            rowCount: 1,
            rows: [
                { id: 1, name: 'John Smith', position: 'application developer' }
            ]
        });

        it('Should reject if value is a string.', async () => {
            const badValues = async () => {
                await client.query('SELECT * FROM employees WHERE id = $1', ['1']);
            }

            assert.rejects(badValues);
        });

        it('Should reject if value is 0 or less.', async () => {
            const badValues = async () => {
                await client.query('SELECT * FROM employees WHERE id = $1', [0]);
            }

            assert.rejects(badValues);
        });

        it('Should reject if value is a float.', async () => {
            const badValues = async () => {
                await client.query('SELECT * FROM employees WHERE id = $1', [1.1]);
            }

            assert.rejects(badValues);
        });
    });
});