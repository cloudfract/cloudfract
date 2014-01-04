var amqp = require('amqplib'),
    amqp_connection = "amqp://guest:guest@localhost:5672",
    amqp_queue_generate = "fractal.generate",
    amqp_queue_update = "fractal.update",
    spawn = require('child_process').spawn
;

// Execute a shell command
function execute(command, callback) {
    spawn(command, function(error, stdout, stderr){ callback(stdout); });
};

// Process fractal generate messages
function generate_fractal(message) {
    if (!message) {
        log.warn("Unable to parse message");
        return false;
    }

    var fractal = JSON.parse(message.content);
    console.log(JSON.stringify(fractal));

    var fractal_image = {
        frame_status: "",
        frame_progress: "0%",
        frame_remaining: "0h0m0s",
        frame_elapsed: "0h0m0s",
        frame_ips: "0",
        ssao_status: "",
        ssao_progress:  "0%",
    };

    var cmd = spawn("/usr/bin/mandelbulber", ["-nogui", "/usr/share/mandelbulber/examples/" + fractal.settings + ".fract"]),
        cmd_out = new Array(), cmd_err = new Array()
    ;

    cmd.stdout.on("data", function (data) {
        var chunk = new String(data);
        cmd_out.push(chunk);

        var line = chunk.trim();
        if (line.indexOf("Done") == 0) {
            fractal_image.frame_status = line;

            var items = line.split(',');            
            fractal_image.frame_progress = items[0].substr(5);
        }

        if (line.indexOf("Rendering Screen Space Ambient Occlusion. Done") == 0) {
            fractal_image.ssao_status = line;
            fractal_image.ssao_progress = line.substr(47, line.indexOf("%") - 46);
        }
        console.log(JSON.stringify(fractal_image));
    });

    cmd.stderr.on("data", function (data) {
        cmd_err.push(data);
        //console.log('stderr: ' + data);
    });

    cmd.on("close", function (code) {
        console.log("Return Code: " + code);

        fractal_image.stdout = cmd_out.join('\n');
        fractal_image.stderr = cmd_err.join('\n');

        if (fractal_image.stdout && fractal_image.stdout.trim().length > 0) {
            console.log("Output:\n" + fractal_image.stdout);
        }

        if (fractal_image.stderr && fractal_image.stderr.trim().length > 0) {
            console.log("Error:\n" + fractal_image.stderr);
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
    consumeQueue(channel, amqp_queue_generate, generate_fractal);
}

// Handle processing once the connection is established
function onConnected(connection) {
    return connection.createChannel().then(onChannelCreated);
}

// Connect to the AMQP server
amqp.connect(amqp_connection).then(onConnected).then(null, console.warn);
