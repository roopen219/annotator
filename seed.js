require('dotenv').config();

const process = require('process');
const fs = require('fs');
const gm = require('gm');
const mongoClient = require('mongodb').MongoClient;

(async function() {
    const connection = await mongoClient.connect(process.env.MONGO_URL);

    console.log(connection);
    fs.readdir('/Users/roopendra/Documents/flower', async function(err, items) {
        async function insertIntoDoc(items) {
            if (items.length) {
                console.log(items[0]);

                const dimensions = await new Promise((resolve => {
                    gm(`/Users/roopendra/Documents/flower/${items[0]}`).size((err, size) => {
                        resolve({
                            ...size
                        });
                    });
                }));

                console.log(dimensions);

                await connection
                    .db()
                    .collection('images')
                    .insertOne({
                        ...dimensions,
                        filename: items[0],
                        class: items[0].split('.')[0].split('-')[1],
                        annotated: false,
                        being_annotated: '',
                        boundingBoxes: []
                    });

                items.splice(0, 1);

                return insertIntoDoc(items);
            }
            return Promise.resolve('done');
        }

        await insertIntoDoc(items);
    });
})();
