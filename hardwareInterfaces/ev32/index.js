/**
 *
 * Created by Kevin Ortman on 12/15/14.
 *
 * Copyright (c) 2015 Kevin Ormtan
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/**
 * Set to true to enable the hardware interface
 **/
exports.enabled = true;

if (exports.enabled) {
    var fs = require('fs'),
        server = require(__dirname + '/../../libraries/HybridObjectsHardwareInterfaces'),
        ev3 = require('ev3dev-lang');
        //GPIO = require('onoff').Gpio;

    /*    
        Example item object in JSON format
        {
                "id": "motor1",
                "ioName": "speed",
                "port": "outA"
        }
    */

    var items = {};

    //load the config file
    var rawItems = JSON.parse(fs.readFileSync(__dirname + "/config.json", "utf8"));

    /**
     * @desc setup() runs once, adds and clears the IO points
     **/
    function setup() {
        server.developerOn();  
    }

    /**
     * @desc teardown() free up any open resources
     **/
    function teardown() {
        for (var key in items) {
            if (items.hasOwnProperty(key)) {
                var item = items[key];
                if ("GPIO" in item) {
                    if (server.getDebug()) console.log("raspberryPi: removing item with the id = '" + item.id + "' and ioName = '" + item.ioName + "'");
                    //item.GPIO.unexport();
                }
            }
        }
    }

    function writeGpioToServer(err, value, item, callback) {
        if (err) {
            console.log("raspberryPi: ERROR receiving GPIO data from id = '" + item.id + "' and ioName = '" + item.ioName + "'");
            console.log(err)
        }

            // only send if we don't have an error and the value has changed
        else if (!("lastValue" in item) || item.lastValue !== value) {
            item.lastValue = value;
            callback(item.id, item.ioName, value); // mode: d for digital
        }
    }

    /**
     * @desc This function is called once by the server. Place calls to addIO(), clearIO(), developerOn(), developerOff(), writeIOToServer() here.
     *       Start the event loop of your hardware interface in here. Call clearIO() after you have added all the IO points with addIO() calls.
     **/
    exports.receive = function () {
        if (server.getDebug()) console.log("raspberryPi: receive()");

        setup();
    };

    /**
     * @desc This function is called by the server whenever data for one of your HybridObject's IO points arrives. Parse the input and write the
     *       value to your hardware.
     * @param {string} objName Name of the HybridObject
     * @param {string} ioName Name of the IO point
     * @param {value} value The value
     * @param {string} mode Specifies the datatype of value
     * @param {type} type The type
     **/
    exports.send = function (objName, ioName, value, mode, type) {
        console.log(objName,ioName,value,mode,type);
        
        var key = objName + ioName;

        try {
            if (items[key] === undefined) {
                if (server.getDebug()) console.log("raspberryPi: send() item not found: id = '" + objName + "' and ioName = '" + ioName + "'");
                return;
            }
            items[key].dutyCycleSp = Math.round(value*100);
            console.log("set motor "+key+"speed to:" + value*100);
        }
        catch (err) {
            if (server.getDebug()) console.log("raspberryPi: dutycycle.write() error: " + err);
        }
    };

    /**
     * @desc prototype for an interface init. The init reinitialize the communication with the external source.
     * @note program the init so that it can be called anytime there is a change to the amount of objects.
     **/
    exports.init = function () {
        if (server.getDebug()) console.log("raspberryPi: init()");
        //close all GPIO's if any are open
        teardown();

        rawItems.forEach(function (item) {
            var key = item.id + item.ioName; // unique item identifier

            if (items[key] !== undefined) {
                throw ("config.json contains two or more items with the id = '" + item.id + "' and ioName = '" + item.ioName + "'");
            }

            

            item.motor = new ev3.Motor(item.port);
            item.motor.dutyCycleSp = 10;
            item.motor.command = 'run-forever';
            
            console.log("created:"+key);

            if (server.getDebug()) console.log("raspberryPi: adding item with the id = '" + item.id + "' and ioName = '" + item.ioName + "'");
            server.addIO(item.id, item.ioName, "default", "ev32");

            items[key] = item;
        });

        server.clearIO("ev32");
    };

    /**
     * @desc This function is called once by the server when the process is being torn down. 
     *       Clean up open file handles or resources and return quickly.
     **/
    exports.shutdown = function () {
        if (server.getDebug()) console.log("ev32: shutdown()");

        teardown();
    };

}