require('dotenv').config();

const express = require('express');
const process = require('process');
const ObjectId = require('mongodb').ObjectId;
const { map, isEmpty } = require('lodash');

const app = express();
const server = require('http').Server(app);

var io = require('socket.io')(server);

const mongoClient = require('mongodb').MongoClient;

let connection, imageCollection;

(async function() {
    connection = await mongoClient.connect(process.env.MONGO_URL);
    imageCollection = connection.db().collection('images');
    console.log('mongo connected');
})();

app.use(express.static('static'));

io.on('connection', function(socket) {
    socket.on('new_image', async (data, ack) => {
        let image, previousImages;

        try {
            previousImages = await imageCollection
                .find({
                    being_annotated: socket.id
                })
                .toArray();

            image = await imageCollection.findOne({
                being_annotated: '',
                annotated: false
            });

            ack(image);
        } catch (e) {
            console.log('Error in new_batch for socket ', socket.id);
            console.log(e);
        } finally {
            await imageCollection.updateOne(
                {
                    _id: image._id
                },
                {
                    $set: {
                        being_annotated: socket.id
                    }
                }
            );

            if (!isEmpty(previousImages)) {
                await imageCollection.updateMany(
                    {
                        _id: {
                            $in: map(previousImages, '_id')
                        }
                    },
                    {
                        $set: {
                            being_annotated: ''
                        }
                    }
                );
            }
        }
    });

    socket.on('close_image', (image_id) => {
        console.log(image_id);
        imageCollection.updateOne({
            _id: ObjectId(image_id)
        }, {
            $set: {
                being_annotated: ''
            }
        });
    });

    socket.on('save_image', async (image_id, boundingBoxes, ack) => {
        await imageCollection.updateOne({
            _id: ObjectId(image_id)
        }, {
            $set: {
                being_annotated: '',
                annotated: true,
                boundingBoxes
            }
        });

        ack(true);
    });

    socket.on('get_image', async (image_id, ack) => {
        const image = await imageCollection.findOne({
            _id: ObjectId(image_id)
        });

        ack(image);
    });

    socket.on('disconnect', () => {
        console.log('disconnecting socket ', socket.id);
        imageCollection.updateMany(
            {
                being_annotated: socket.id
            },
            {
                $set: {
                    being_annotated: ''
                }
            }
        );
    });
});

server.listen(4000, process.env.HOST, () =>
    console.log(`Annotator listening on port ${process.env.PORT}!`)
);
