const { MongoClient } = require('mongodb');
const { setupDatabase, teardownDatabase } = require('./setup');

let db;

beforeAll(async () => {
    db = await setupDatabase();
});

afterAll(async () => {
    await teardownDatabase();
});

test('should retrieve data from the database', async () => {
    const result = await db.collection('yourCollection').find({}).toArray();
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
});