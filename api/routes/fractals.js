var amqp = require('amqplib'),
    crypto = require('crypto')
;

module.exports = function(app) {
    // List fractals
    app.get("/fractals", function(req, res) {
        res.send([{name:'fractal1'}, {name:'fractal2'}, {name:'fractal3'}]);
    });

    // Show fractal
    app.get("/fractals/:id", function(req, res) {
        res.send({ id: req.params.id, name: "The Name", notes: "Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum." });
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
            status: "saving",
            name: req.body.fractal.name,
            notes: req.body.fractal.notes,
            settings: req.body.fractal.settings,
            id: crypto.createHash('md5').update(fractal.type + ":" + req.body.fractal.settings).digest("hex")
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
