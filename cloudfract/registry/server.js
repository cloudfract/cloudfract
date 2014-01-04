var amqp = require("amqplib"),
    amqp_connection = "amqp://guest:guest@localhost:5672",
    amqp_queue_save = "fractal.save",
    amqp_queue_update = "fractal.update",
    couchdb_host = "http://localhost:5984",
    couchdb_database = "fractals",
    couchdb = require("nano")(couchdb_host)
;

// Ensure database exists
function init_database() {
    couchdb.db.create(couchdb_database, function(err, body) {
        if (!err) {
            console.log("Created database: " + JSON.stringify(body));
        }
    });
}

// Process fractal save messages
function save_fractal(message) {
    if (!message) {
        log.warn("Unable to parse message");
        return false;
    }

    var fractal = JSON.parse(message.content);
    console.log(JSON.stringify(fractal));

    var db = couchdb.use(couchdb_database);
    db.get(fractal.id, function(err, body) {
        if (!err) {
            message.content = JSON.stringify(body);
            console.warn("Document already exists. " + message.content);
        } else {
            db.insert(fractal, fractal.id, function(err, body) {
                if (err) {
                    console.warn("Unable to save document. " + err);
                } else {
                    message.content = JSON.stringify(body);
                    console.log("Created document: " + message.content);
                }
            });
        }
    });

    return message;
}

// Process fractal update messages
function update_fractal(message) {    
    if (!message) {
        log.warn("Unable to parse message");
        return false;
    }

    var fractal = JSON.parse(message.content);
    console.log(JSON.stringify(fractal));

    var db = couchdb.use(couchdb_database);
    db.get(fractal.id, function(err, body) {
        if (err) {
            console.warn("Unable to retrieve document. " + err);
        } else {
            doc = body;
            doc.name = fractal.name;
            doc.notes = fractal.notes;
            doc.status = fractal.status;
            doc.updated = new Date();

            db.insert(doc, doc._id, function(err, body) {
                if (err) {
                    console.warn("Unable to update document: " + err);
                } else {
                    message.content = JSON.stringify(body);
                    console.log("Updated document: " + message.content);
                }
            });
        }
    });

    return message;
}

// Setup a consumer for a queue
function consumeQueue(channel, queue, callback) {
    channel.assertQueue(queue);
    console.log("Listening for requests on queue: " + queue);
    channel.consume(queue, function(message) {
        channel.ack(callback(message));
    });
}

// Handle processing once the channel has been created
function onChannelCreated(channel) {
    consumeQueue(channel, amqp_queue_save, save_fractal);
    consumeQueue(channel, amqp_queue_update, update_fractal);
}

// Handle processing once the connection is established
function onConnected(connection) {
    init_database();
    return connection.createChannel().then(onChannelCreated);
}

// Connect to the AMQP server
amqp.connect(amqp_connection).then(onConnected).then(null, console.warn);
