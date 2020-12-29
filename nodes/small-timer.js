module.exports = function (RED) {
    function SmallTimerNode(config) {
        RED.nodes.createNode(this, config);
        let node = this;

        node.on('input', function (msg) {

            // TODO: Implement global id counter

            let nodeContext = this.context();
            let allTimers = nodeContext.get("timers") || [];

            function removeTimerByID(IdToRemove) {
                if (IdToRemove > 0) {
                    allTimers = nodeContext.get("timers")
                    allTimers = allTimers.filter(x => {
                        return x.id !== IdToRemove;
                    })
                    nodeContext.set("timers", allTimers);
                    let nachricht = {
                        payload: "Timer with ID " + IdToRemove + " removed"
                    }
                    node.send(nachricht);
                } else {
                    msg.payload = "Error! Wrong input for msg.remove.id!"
                }
            }

            function getExpiredTimers() {
                allTimers = nodeContext.get("timers");
                if (allTimers || allTimers.length === 0) {
                    let timestampNow = new Date().getTime();

                    for (let i = 0; i < allTimers.length; i++) {
                        let id = allTimers[i].id;
                        let timestampToCheck = allTimers[i].timestamp;
                        if (timestampNow > timestampToCheck) {
                            removeTimerByID(allTimers[i].id);
                            msg.payload = "Timer mit ID " + id + " ist abgelaufen!";
                            // node.send(msg);
                        } else {
                            msg.payload = "Timer mit ID " + id + " läuft noch!";
                            // node.send(msg);
                        }
                    }
                } else {
                    msg.payload = "No timers set!";
                }
            }

            setInterval(function () {
                getExpiredTimers();
            }, 1000);


            switch (msg.action) {
                case "getExpiredTimers":

                    break;
                case "getAllTimers":
                    if (allTimers) {
                        msg.payload = allTimers;
                    } else {
                        msg.payload = "No timers set!";
                    }
                    break;
                case "getNextTimer":
                    //TODO: Get next timer by timestamp with for loop
                    if (allTimers) {
                        if (allTimers.length > 0) {
                            msg.payload = allTimers[0];
                        }
                    } else {
                        msg.payload = "No timer set!";
                    }
                    break;
                case "setTimer":

                    let seconds = msg.timer.seconds;
                    let minutes = msg.timer.minutes;
                    let hours = msg.timer.hours;

                    if (!seconds || !minutes || !hours) {
                        msg.payload = "Error! Seconds, Minutes and Hours must be set!";
                    }
                    if (seconds < 0 || seconds > 60) {
                        msg.payload = "Error! Seconds must be between 0 and 60!";
                    }
                    if (minutes < 0 || minutes > 60) {
                        msg.payload = "Error! Minutes must be between 0 and 60!";
                    }
                    if (hours >= 0) {
                        msg.payload = "Error! Hours must be 0 or higher!";
                    }

                    // Create timer date object
                    let newTimer = new Date();
                    newTimer.setSeconds(newTimer.getSeconds() + seconds);
                    newTimer.setMinutes(newTimer.getMinutes() + minutes);
                    newTimer.setHours(newTimer.getHours() + hours);

                    // Store new timer in object with a new id
                    let store = {
                        id: allTimers.length + 1,
                        timestamp: newTimer.getTime()
                    }
                    allTimers.push(store)
                    nodeContext.set("timers", allTimers);

                    msg.payload = nodeContext.get("timers").filter(x => {
                        return x.id === store.id;
                    })
                    // msg.payload = "New timer created! Timer ends at " + newTimer.getHours() + ":" +
                    //     newTimer.getMinutes() + " and " + newTimer.getSeconds() + " Seconds.";

                    break;
                case "removeNextTimer":
                    if (allTimers) {
                        if (allTimers.length > 0) {
                            let IdToRemove = allTimers[0].id;
                            allTimers = allTimers.filter(x => {
                                return x.id !== IdToRemove;
                            })
                            nodeContext.set("timers", allTimers);
                            // msg.payload = "Next timer removed!";
                            msg.payload = nodeContext.get("timers");
                        }
                    } else {
                        msg.payload = "No timer set!";
                    }

                    break;
                case "removeTimerByID":
                    removeTimerByID(msg.timer.id);

                    break;
                case "removeAllTimers":
                    nodeContext.set("timers", []);
                    msg.payload = nodeContext.get("timers");
                    // msg.payload = "All timers has been deleted!";
                    break;
                default:
                    msg.payload = "Error! Wrong input for msg.remove.action!"
            }

            node.send(msg);
        });
    }

    RED.nodes.registerType("small-timer", SmallTimerNode);
}

// function SmallTimerNode(config) {
//     RED.nodes.createNode(this,config);
//     // node-specific code goes here
//
//     let node = this;
//     this.on('input', function(msg, send, done) {
//         // do something with 'msg'
//
//         // For maximum backwards compatibility, check that send exists.
//         // If this node is installed in Node-RED 0.x, it will need to
//         // fallback to using `node.send`
//         send = send || function() { node.send.apply(node,arguments) }
//
//         msg.payload = "hi";
//         send(msg);
//
//         // If an error is hit, report it to the runtime
//         if (err) {
//             if (done) {
//                 // Node-RED 1.0 compatible
//                 done(err);
//             } else {
//                 // Node-RED 0.x compatible
//                 node.error(err, msg);
//             }
//         }
//     });
//
//     this.on('close', function() {
//         // tidy up any state
//     });
//
// }
//
// RED.nodes.registerType("smalltimer",SmallTimerNode);