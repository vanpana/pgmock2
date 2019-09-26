import md5 from 'md5';
import { IPGClient } from './interfaces';

/**
 * An NPM module for mocking a connection to a PostgreSQL database.
 * @author Jason Favrod <mail@jasonfavrod.com>
 * @example
 * ```
 * const PGMock2 = require('pgmock2'),
 * const pgmock = new PGMock2(); 
 * ```
 */
export default class PGMock2 {
    private data = {};
    private latency = 20;

    public setLatency(latency: number): void {
        this.latency = latency;
    }

    /**
     * Add a query, it's value definitions, and response to the
     * mock database.
     * @param {string} query An SQL query statement.
     * @param {array} valueDefs Contains the types of each value used
     * in the query.
     * @param {object} response The simulated expected response of
     * the given query.
     * @example
     * ```
     * pgmock.add("SELECT * FROM employees WHERE id = $1", ['number'], {
     *     rowCount: 1,
     *     rows: [
     *         { id: 0, name: 'John Smith', position: 'application developer' }
     *     ]
     * });
     * ```
     */
    public add(query: string, valueDefs: any[], response: object) {
        this.data[this.normalize(query)] = {
            query: query,
            valDefs: valueDefs,
            response: response
        };
    };

    /**
     * Get a simulated pg.Client or pg.Pool connection.
     * @namespace connect
     * @returns {object}
     * @example const conn = pgmock.connect();
     */
    public connect(): object {
        const connection: IPGClient = {
            /**
             * Simulate ending a pg connection.
             * @memberof connect
             * @example conn.release();
             */
            end: () =>  new Promise((res) => res()),

            /**
             * Query the mock database.
             * @memberof connect
             * @param {string} sql An SQL statement.
             * @param {array} values Arguments for the SQL statement or
             * an empty array if no values in the statement.
             * @example conn.query('select * from employees where id=$1;', [0])
             * .then(data => console.log(data))
             * .catch(err => console.log(err.message));
             * @example {
             *   rowCount: 1,
             *   rows: [
             *       { id: 0, name: 'John Smith', position: 'application developer' } 
             *   ]
             * }
             */
            query: (sql: string, values: any[]) => {
                let norm = this.normalize(sql);
                const validQuery = this.data[norm];

                return new Promise( (resolve, reject) => {
                    if (validQuery && this.validVals(values, this.data[norm].valDefs)) {
                        setTimeout(function() {
                            resolve(this.data[norm].response)
                        }, this.latency);
                    }
                    else {
                        if (!validQuery) {
                            setTimeout(function() {
                                reject(new Error('invalid query: ' + sql + ' query hash: ' + this.normalize(sql)))
                            }, this.latency);
                        }
                        else {
                            setTimeout(function() {
                                reject(new Error('invalid values: ' + JSON.stringify(values)))
                            }, this.latency);
                        }
                    }
                });
            },

            /**
             * Simulate releasing a pg connection.
             * @memberof connect
             * @example conn.release();
             */
            release: () =>  new Promise((res) => res()),
        };

        return connection;
    };

    /**
     * Remove a query from the mock database.
     * @param {string} query An SQL statement added with the add method.
     * @returns {boolean} true if removal successful, false otherwise.
     */
    public drop(query: string): boolean {
        return delete this.data[this.normalize(query)];
    };

    /**
     * Flushes the mock database.
     */
    public dropAll(): void {
        this.data = {};
    };

    // Return the rawQuery in lowercase, without spaces nor
    // a trailing semicolon.
    private normalize(rawQuery: string): string {
        const norm = rawQuery.toLowerCase().replace(/\s/g,'');
        return md5(norm.replace(/;$/,'')).toString();
    }

    /**
     * Return a string representation of the mock database.
     * @example
     * ```
     * {
     *     "3141ffa79e40392187830c52d0588f33": {
     *         "query": "SELECT * FROM tpd_hawaii_it.projects",
     *         "valDefs": [],
     *         "response": {
     *             "rowCount": 3,
     *             "rows": [
     *                 {
     *                     "title": "Test Project 0",
     *                     "status": "pending",
     *                     "priority": "low",
     *                     "owner": "Favrod, Jason"
     *                 },
     *                 {
     *                     "title": "Test Project 1",
     *                     "status": "pending",
     *                     "priority": "low",
     *                     "owner": "Favrod, Jason"
     *                 },
     *             ]
     *         }
     *     },
     *     "81c4b35dfd07db7dff2cb0e91228e833": {
     *         "query": "SELECT * FROM tpd_hawaii_it.projects WHERE title = $1",
     *         "valDefs": ["string"],
     *         "response": {
     *             "rowCount": 1,
     *             "rows": [
     *                 {
     *                     "title": "Test Project 0",
     *                     "status": "pending",
     *                     "priority": "low",
     *                     "owner": "Favrod, Jason"
     *                 }
     *             ]
     *         }
     *     }
     * }
     * ```
     */
    public toString = function() {
        return JSON.stringify(this.data, null, 2);
    };

    private validVals(values: any[], defs: any[]) {
        let bool = true;

        if (values && values.length) {
            if (!defs.length || values.length !== defs.length) {
                throw Error('Each value must have a corresponding definition.');
            }

            values.forEach( (val, i) => {
                if (typeof(defs[i]) === 'string') {
                    if (typeof(val) !== defs[i]) bool = false;
                }
                else if (typeof(defs[i]) === 'function') {
                    if (!defs[i](val)) bool = false;
                }
            });
        }

        return bool;
    }
}
