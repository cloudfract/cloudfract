var amqp = require('amqplib'),
    uuid = require("node-uuid"),
    when = require("when"),
    defer = when.defer
;

module.exports = function(app) {
    // List fractals
    app.get("/fractals", function(req, res) {
        amqp.connect(app.get("amqp_connection")).then(function(conn) {
            return when(conn.createChannel().then(function(ch) {
                var answer = defer();
                var corrId = uuid();

                function maybeAnswer(msg) {
                    if (msg.properties.correlationId === corrId) {
                        answer.resolve(msg.content.toString());
                    }
                }

                var ok = ch.assertQueue('', {exclusive: true}).then(function(qok) { return qok.queue; });

                ok = ok.then(function(queue) {
                    return ch.consume(queue, maybeAnswer, {noAck: true}).then(function() { return queue; });
                });

                ok = ok.then(function(queue) {
                    ch.sendToQueue(app.get("amqp_queue_list"), new Buffer("list"), { correlationId: corrId, replyTo: queue });
                    return answer.promise;
                });

                return ok.then(function(message) {
                    return res.send(JSON.parse(message));
                });
            })).ensure(function() { conn.close(); });
        }).then(null, console.warn);
    });

    // Show fractal
    app.get("/fractals/:id", function(req, res) {
        amqp.connect(app.get("amqp_connection")).then(function(conn) {
            return when(conn.createChannel().then(function(ch) {
                var answer = defer();
                var corrId = uuid();

                function maybeAnswer(msg) {
                    if (msg.properties.correlationId === corrId) {
                        answer.resolve(msg.content.toString());
                    }
                }

                var ok = ch.assertQueue('', {exclusive: true}).then(function(qok) { return qok.queue; });

                ok = ok.then(function(queue) {
                    return ch.consume(queue, maybeAnswer, {noAck: true}).then(function() { return queue; });
                });

                ok = ok.then(function(queue) {
                    ch.sendToQueue(app.get("amqp_queue_fetch"), new Buffer(req.params.id), { correlationId: corrId, replyTo: queue });
                    return answer.promise;
                });

                return ok.then(function(message) {
                    return res.send(JSON.parse(message));
                });
            })).ensure(function() { conn.close(); });
        }).then(null, console.warn);
    });

    // Create fractal
    app.post("/fractals", function(req, res) {
        var fractal = req.body.fractal;
        if (!req.body.fractal) {
            return res.send(409,  { error: "Unable to parse fractal object" });
        } else if (!req.body.fractal.name) {
            return res.send(409,  { error: "Fractal name property is required" });
        } else if (!req.body.fractal.settings) {
            return res.send(409,  { error: "Fractal settings property is required" });
        }

        var fractal = {
            type: "default",
            created: new Date(),
            state: "saving",
            status: "queued for fractal generation",
            name: req.body.fractal.name,
            notes: req.body.fractal.notes,
            settings: req.body.fractal.settings,
            id: uuid()
        }

        amqp.connect(app.get("amqp_connection")).then(function(conn) {
            var ok = conn.createChannel().then(function(ch) {
                ch.assertQueue(app.get("amqp_queue_save"));
                ch.assertQueue(app.get("amqp_queue_generate"));

                var fractal_buffer = new Buffer(JSON.stringify(fractal));
                ch.sendToQueue(app.get("amqp_queue_save"), fractal_buffer);
                ch.sendToQueue(app.get("amqp_queue_generate"), fractal_buffer);
            });
            return ok;
        }).then(null, console.warn);
        res.send(202, { fractal: fractal });
    });

    // Update fractal
    app.put("/fractals/:id", function(req, res) {
        var fractal = req.body.fractal;
        if (!req.body.fractal) {
            return res.send(409,  { error: "Unable to parse fractal object" });
        }

        amqp.connect(app.get("amqp_connection")).then(function(conn) {
            var ok = conn.createChannel().then(function(ch) {
                ch.assertQueue(app.get("amqp_queue_update"));
                ch.sendToQueue(app.get("amqp_queue_update"), new Buffer(JSON.stringify(fractal)));
            });
            return ok;
        }).then(null, console.warn);
        res.send(202, { fractal: fractal });
    });

    // Remove fractal
    app.delete("/fractals/:id", function(req, res) {
        var fractal = req.body.fractal;
        if (!req.body.fractal) {
            return res.send(409,  { error: "Unable to parse fractal object" });
        }

        amqp.connect(app.get("amqp_connection")).then(function(conn) {
            var ok = conn.createChannel().then(function(ch) {
                ch.assertQueue(app.get("amqp_queue_remove"));
                ch.sendToQueue(app.get("amqp_queue_remove"), new Buffer(JSON.stringify(fractal)));
            });
            return ok;
        }).then(null, console.warn);
        res.send(202, { fractal: fractal });
    });
};
