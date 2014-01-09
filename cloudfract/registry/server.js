#!/usr/bin/env node

var amqp = require("amqplib"),
    amqp_connection = "amqp://guest:guest@localhost:5672",
    amqp_queue_list = "fractal.list",
    amqp_queue_fetch = "fractal.fetch",
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

// Process list fractals messages
function on_list_message(channel, message) {
    if (!message) {
        log.warn("Unable to parse list fractals message");
        return false;
    }

    var db = couchdb.use(couchdb_database);
    db.view('fractal_design', 'fractal_list', function(err, body) {
        var response;
        if (!err) {
            var fractal_list = body.rows.map(function(row) { return row.value });
            response = new Buffer(JSON.stringify({ fractals: fractal_list, total: body.total_rows, offset: body.offset }));
        } else {
            console.warn("Unable to retrieve fractal list. %s", err);
            response = new Buffer(JSON.stringify({ error: err }));
        }
        channel.sendToQueue(message.properties.replyTo, response, { correlationId: message.properties.correlationId });
    });

    return message;
}

// Process fetch fractal messages
function on_fetch_message(channel, message) {
    if (!message) {
        log.warn("Unable to parse fetch fractal message");
        return false;
    }

    var db = couchdb.use(couchdb_database);
    db.get(message.content, function(err, body) {
        var response = new Buffer(JSON.stringify({ fractal: body }));
        if (err) {
            console.warn("Unable to retrieve document. %s", err);
            response = new Buffer(JSON.stringify({ error: err }));
        }
        channel.sendToQueue(message.properties.replyTo, response, { correlationId: message.properties.correlationId });
    });

    return message;
}

// Process fractal save messages
function on_save_message(channel, message) {
    if (!message) {
        log.warn("Unable to parse save fractal message");
        return false;
    }

    var fractal = JSON.parse(message.content);
    console.log("Save Fractal: " + JSON.stringify(fractal));

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
function on_update_message(channel, message) {    
    if (!message) {
        log.warn("Unable to parse update fractal message");
        return false;
    }

    var fractal = JSON.parse(message.content);
    console.log("Update Fractal: " + JSON.stringify(fractal));

    var db = couchdb.use(couchdb_database);
    db.get(fractal.id, function(err, body) {
        if (err) {
            console.warn("Unable to retrieve document. " + err);
        } else {
            doc = body;
            
            for (var property in fractal) {
                doc[property] = fractal[property];
            }

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
        channel.ack(callback(channel, message));
    });
}

// Handle processing once the channel has been created
function onChannelCreated(channel) {
    consumeQueue(channel, amqp_queue_list, on_list_message);
    consumeQueue(channel, amqp_queue_fetch, on_fetch_message);
    consumeQueue(channel, amqp_queue_save, on_save_message);
    consumeQueue(channel, amqp_queue_update, on_update_message);
}

// Handle processing once the connection is established
function onConnected(connection) {
    init_database();
    return connection.createChannel().then(onChannelCreated);
}

// Connect to the AMQP server
amqp.connect(amqp_connection).then(onConnected).then(null, console.warn);
