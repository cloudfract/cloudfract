#!/usr/bin/env node

var amqp = require('amqplib'),
    amqp_connection = "amqp://guest:guest@localhost:5672",
    amqp_queue_generate = "fractal.generate",
    amqp_queue_update = "fractal.update",
    status_update_interval = 5,
    spawn = require('child_process').spawn,
    btoa = require('btoa'),
    fs = require('fs')
;

// Post a status message
function publish_status_update(fractal) {
    amqp.connect(amqp_connection).then(function(conn) {
        var ok = conn.createChannel().then(function(ch) {
            ch.assertQueue(amqp_queue_update);
            ch.sendToQueue(amqp_queue_update, new Buffer(JSON.stringify(fractal)));
        });
        return ok;
    }).then(null, console.warn);
}

// Process fractal generate messages from bus
function on_generate_message(message) {
    if (!message) {
        log.warn("Unable to parse generate message");
        return false;
    }

    var fractal = JSON.parse(message.content),
        cmd = spawn("/usr/bin/mandelbulber", ["-nogui", "/usr/share/mandelbulber/examples/" + fractal.settings + ".fract"]),
        cmd_out = new Array(), cmd_err = new Array()
    ;

    fractal.state = "generating";
    fractal.status = "generating fractal image";

    var interval_id = setInterval(function() {
            publish_status_update(fractal);
        }, status_update_interval * 1000);

    cmd.stdout.on("data", function (data) {
        var chunk = new String(data);
        cmd_out.push(chunk);

        var lines = chunk.split('\n');
        lines.forEach(function(entry) {
            var line = entry.trim();

            if (line.indexOf("commandline: settings file:") == 0) {
                fractal.settings_file = line.substr(28);
            }

            if (line.indexOf("Default data directory:") == 0) {
                fractal.data_directory = line.substr(24);
            }

            if (line.indexOf("Done") == 0) {
                fractal.status = "rendering frames";

                var items = line.split(',');
                fractal.frame_progress = items[0].substr(5).replace('%', '');
                fractal.frame_remaining = items[1].substr(9);
                fractal.frame_elapsed = items[2].substr(11);
                fractal.frame_ips = items[3].substr(11);
                fractal.overall_progress = (parseInt(fractal.frame_progress) / 200) * 100;
            }

            if (line.indexOf("Rendering Screen Space Ambient Occlusion. Done") == 0) {
                fractal.state = "rendering";
                fractal.status = "rendering screen space ambient occlusion";
                fractal.ssao_progress = line.substr(47, line.indexOf("%") - 47);
                fractal.overall_progress = ((parseInt(fractal.frame_progress) + parseInt(fractal.ssao_progress)) / 200) * 100;
            }

            if (line.indexOf("Image saved:") == 0) {
                fractal.frame_progress = 100;
                fractal.ssao_progress = 100;
                fractal.overall_progress = 100;
                fractal.state = "generated";
                fractal.status = "rendering complete";
                fractal.image_location = line.substr(13);
            }
        });

        //console.log("Fractal: " + JSON.stringify(fractal));
    });

    cmd.stderr.on("data", function (data) {
        cmd_err.push(data);
    });

    cmd.on("close", function (code) {
        fractal.stdout = cmd_out.join('\n');
        fractal.stderr = cmd_err.join('\n');

        fractal.status = "saving image data";
        fractal.image = {
            content_type: 'image/jpeg',
            data: btoa(fs.readFileSync(fractal.data_directory + "/" + fractal.image_location))
        };

        fractal.state = "active";
        fractal.status = "";

        clearInterval(interval_id);
        publish_status_update(fractal);
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
    consumeQueue(channel, amqp_queue_generate, on_generate_message);
}

// Handle processing once the connection is established
function onConnected(connection) {
    process.once('SIGINT', function() { connection.close(); });
    return connection.createChannel().then(onChannelCreated);
}

// Connect to the AMQP server
amqp.connect(amqp_connection).then(onConnected).then(null, console.warn);
