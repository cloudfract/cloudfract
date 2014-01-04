var LISTEN_PORT = 8080;

var express = require("express");
var app = express();

app.configure(function () {
    app.set("amqp_connection", "amqp://guest:guest@localhost:5672");
    app.set("amqp_queue_save", "fractal.save");
    app.set("amqp_queue_generate", "fractal.generate");
    app.set("amqp_queue_update", "fractal.update");
    app.set("amqp_queue_remove", "fractal.remove");

    app.use(express.logger("dev")); /* default, short, tiny, dev */
    app.use(express.json());
    app.use(express.static("static"));

    app.use(function(err, req, res, next) {
        console.error(err.stack);
        res.send(500);
    });
});

require("./routes/fractals")(app);
require("./routes/index")(app);

app.listen(LISTEN_PORT);
console.log("Listening on port " + LISTEN_PORT);
