module.exports = function (RED) {
    function SmallTimerNode(config) {
        RED.nodes.createNode(this, config);
        let node = this;

        node.on('input', function (msg) {
            let returnMessage = {
                payload: ""
            }

            const status = {
                EXPIRED: "expired",
                REMOVED: "removed",
                RUNNING: "running",
                UNDEFINED: "undefined",
                SYNTAX_ERR: "syntax_error"
            }

            let nodeContext = this.context();
            let allTimers = nodeContext.get("timers") || [];
            let idCounter = nodeContext.get("idCounter") || 0;

            // Make sure context "timers" exists
            nodeContext.set("timers", allTimers);

            function setTimer(timer) {
                let seconds = timer.seconds;
                let minutes = timer.minutes;
                let hours = timer.hours;

                if (seconds === undefined || minutes === undefined || hours === undefined) {
                    returnMessage.payload = "Error! Seconds, minutes, hours and days must be set!";
                    node.send(returnMessage);
                    return;
                }
                if (seconds < 0) {
                    returnMessage.payload = "Error! Seconds must be between 0 and 60!";
                    node.send(returnMessage);
                    return;
                }
                if (minutes < 0) {
                    returnMessage.payload = "Error! Minutes must be between 0 and 60!";
                    node.send(returnMessage);
                    return;
                }
                if (hours < 0) {
                    returnMessage.payload = "Error! Hours must be 0 or higher!";
                    node.send(returnMessage);
                    return;
                }

                // Create timer date object
                let newTimer = new Date();
                newTimer.setSeconds(newTimer.getSeconds() + seconds);
                newTimer.setMinutes(newTimer.getMinutes() + minutes);
                newTimer.setHours(newTimer.getHours() + hours);

                // Store new timer in object with a new id
                let id = nodeContext.get("idCounter") + 1;
                let store = {
                    id: id,
                    status: status.RUNNING,
                    timestamp: newTimer.getTime(),
                    restTime: calcTimeUntilTimestamp(newTimer.getTime()),
                    notice: "Timer with ID " + id + " started."
                }

                // increase id counter by 1
                idCounter++;
                nodeContext.set("idCounter", idCounter);

                // save new timer
                allTimers.push(store)
                nodeContext.set("timers", allTimers);

                // Return new stored timer from node context
                returnMessage.payload = nodeContext.get("timers").filter(x => {
                    return x.id === store.id;
                })[0]
                node.send(returnMessage);
            }

            function removeTimerByID(IdToRemove, statusToSet) {
                if (IdToRemove <= 0) {
                    returnMessage.payload = {
                        id: IdToRemove,
                        status: status.SYNTAX_ERR,
                        notice: "Error! Wrong input for msg.remove.id! Must be > 0"
                    }
                    node.send(returnMessage)
                }
                allTimers = nodeContext.get("timers")
                let found = allTimers.find(element => element.id === IdToRemove);
                if (found === undefined) {
                    returnMessage.payload = {
                        id: IdToRemove,
                        status: status.UNDEFINED,
                        notice: "Error! ID not found."
                    }
                    node.send(returnMessage)
                } else {
                    allTimers = allTimers.filter(x => {
                        return x.id !== IdToRemove;
                    })
                    nodeContext.set("timers", allTimers);
                    returnMessage.payload = {
                        id: IdToRemove,
                        status: statusToSet,
                        notice: "Timer with ID " + IdToRemove + " removed"
                    }
                    node.send(returnMessage);
                }
            }

            function removeExpiredTimers() {
                allTimers = nodeContext.get("timers");
                if (allTimers) {
                    if (allTimers.length > 0) {
                        let timestampNow = new Date().getTime();
                        for (let i = 0; i < allTimers.length; i++) {
                            let timestampToCheck = allTimers[i].timestamp;
                            if (timestampNow > timestampToCheck) {
                                removeTimerByID(allTimers[i].id, status.EXPIRED);
                                // function will send node message
                            }
                        }
                    } else if (allTimers.length === 0) {
                        // Set id counter to 0
                        nodeContext.set("idCounter", 0);
                    }
                }
            }

            setInterval(function () {
                removeExpiredTimers();
            }, 1000);

            function calcTimeUntilTimestamp(timestamp) {
                let now = new Date();
                let diffMilliseconds = (timestamp - now); // milliseconds between now & Christmas
                let diffDays = Math.floor(diffMilliseconds / 86400000); // days
                let diffHours = Math.floor((diffMilliseconds % 86400000) / 3600000); // hours
                let diffMinutes = Math.floor(((diffMilliseconds % 86400000) % 3600000) / 60000); // minutes
                let diffSeconds = Math.round((((diffMilliseconds % 86400000) % 3600000) % 60000) / 1000); //seconds
                let restTime = {
                    days: diffDays,
                    hours: diffHours,
                    minutes: diffMinutes,
                    seconds: diffSeconds
                }
                return restTime;
            }

            function sortTimersByTimestamp(timers) {
                // Sort timers by timestamp
                timers.sort(function(x, y){
                    return x.timestamp - y.timestamp;
                })
                return timers;
            }

            switch (msg.action) {
                case "getAllTimers":
                    if (allTimers) {
                        if (allTimers.length > 0) {
                            for(let i = 0; i < allTimers.length; i++) {
                                let tmp = allTimers[i];
                                tmp.restTime = calcTimeUntilTimestamp(allTimers[i].timestamp);
                                allTimers[i] = tmp;
                            }
                            allTimers = sortTimersByTimestamp(allTimers);
                            returnMessage.payload = {
                                timers: allTimers
                            };
                            node.send(returnMessage);
                        } else {
                            returnMessage.payload = {
                                timers: nodeContext.get("timers"),
                                notice: "No timers set!"
                            };
                            node.send(returnMessage);
                        }
                    }
                    break;
                case "getNextTimer":
                    if (allTimers) {
                        if (allTimers.length > 0) {
                            allTimers = sortTimersByTimestamp(allTimers);
                            allTimers[0].restTime = calcTimeUntilTimestamp(allTimers[0].timestamp);
                            returnMessage.payload = allTimers[0];
                        } else {
                            returnMessage.payload = {
                                timers: nodeContext.get("timers"),
                                notice: "No timers set!"
                            };
                        }
                    }
                    node.send(returnMessage);
                    break;
                case "setTimer":
                    setTimer(msg.timer);
                    break;
                case "removeNextTimer":
                    if (allTimers) {
                        if (allTimers.length > 0) {
                            // Sort all timers by timestamp
                            allTimers = sortTimersByTimestamp(allTimers);
                            // remove first timer in array. function will send node message
                            removeTimerByID(allTimers[0].id, status.REMOVED);
                        } else {
                            returnMessage.payload = {
                                timers: nodeContext.get("timers"),
                                notice: "No timers set!"
                            };
                            node.send(returnMessage);
                        }
                    }
                    break;
                case "removeTimerByID":
                    // function will send node message
                    removeTimerByID(msg.timer.id, status.REMOVED);
                    break;
                case "removeAllTimers":
                    nodeContext.set("timers", []);
                    returnMessage.payload = {
                        timers: nodeContext.get("timers"),
                        notice: "All timers deleted!"
                    };
                    node.send(returnMessage);
                    break;
                default:
                    returnMessage.payload = "Error! Wrong input for msg.remove.action!"
                    node.error(returnMessage);
            }
        });
    }

    RED.nodes.registerType("small-timer", SmallTimerNode);
}