/*
   This is a straight-through proxy, to the V2 legacy api on the V3 system. This
   example is driven via the V2 client SDK - as such it elaborates none of the new V3 features.
*/

var request = require("request")
var express = require("express")
var https = require('https')
var http = require('http')
var url = require('url')
var fs = require('fs')
var bodyParser = require('body-parser');

function get_config() {
    var config_file = process.argv[2]

    if (!config_file) {
        console.log("Please provide config file name as argument")
        process.exit(1)
    }

    if (!fs.existsSync(config_file)) {
        console.log(config_file + " does not exist")
        process.exit(1)
    }

    return JSON.parse(fs.readFileSync(config_file))
}


var conf = get_config()


function is_cell() {
    return conf.gateway == "NEURON"
}


function neuron() {
    return process.env.NEURON_PORT_4006_TCP_ADDR
}


function get_gateway() {
    return (is_cell()) ? neuron() + ":4003" : conf.gateway
}


function get_mount_point(app) {
    var mountPoint;
    if (is_cell()) {
        // a cell requires to be on a sub-url as nginx knows about "/xsdk", mounting is a good way to achieve this
        mountPoint = express()
        app.use("/xsdk", mountPoint)
        console.log("mounting on /xsdk")
    } else {
        mountPoint = app
    }
    mountPoint.use(bodyParser.json())
    mountPoint.use(bodyParser.urlencoded({ extended: true }))
    mountPoint.use(express.static('./public'));
    return mountPoint
}

var app = express();

var mountPoint = get_mount_point(app),
    gw = conf.protocol + "://" + get_gateway()


if (conf.protocol == "https") {
    var opts = {
        key: fs.readFileSync(conf.key_file),
        cert: fs.readFileSync(conf.cert_file)
    };
    https.createServer(opts, app).listen(conf.port)
} else {
    console.log("Http server on " + conf.port)
    http.createServer(app).listen(conf.port)
}


//Returns Secure token to connect to the service.
mountPoint.post('/signal/token', function(req, res) {
    body = req.body
    body["ident"] = conf.ident
    body["secret"] = conf.secret
    var url = gw + "/signal/token"
    request.post({ url: gw + "/signal/token", json: true, form: body }).pipe(res)
})


//Returns List of valid signaling servers that the clients can connect to.
mountPoint.get('/signal/list', function(req, res) {
    var secure = req.query.secure
    if (!secure)
        sec = ""
    else
        sec = "?secure=" + secure

    request.get({ url: gw + "/signal/list" + sec, json: true }).pipe(res)
})


//Returns a Valid ICE server setup to handle the WebRTC handshake and TURN connection if needed.
mountPoint.post('/ice', function(req, res) {
    var body = req.body
    body["ident"] = conf.ident
    body["secret"] = conf.secret
    request.post({ url: gw + "/ice", json: true, form: body }).pipe(res)
});


// an interesting tweak on serving different xirsys_connects for various purposes ...
mountPoint.get('/xirsys_connect.js', function(req, res) {
    res.writeHead(200, { 'Content-Type': 'application/javascript' })
    var xirsysConnect = {
        secureTokenRetrieval: true,
        server: '',
        data: {
            domain: 'www.xirsys.com',
            application: 'default',
            room: 'default'
        }
    }

    var xc = "var xirsysConnect=" + JSON.stringify(xirsysConnect) + ";\n"

    res.end(xc)
});