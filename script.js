// =====================================================
// TECHAQUARIUM - DASHBOARD JAVASCRIPT
// Login, MQTT, Temperature, Feeder, Schedule
// =====================================================

// 1. HTML ELEMENTS

const loginScreen = document.getElementById("loginScreen");
const loginForm = document.getElementById("loginForm");
const loginUsername = document.getElementById("loginUsername");
const loginButton = document.getElementById("loginButton");
const loginStatus = document.getElementById("loginStatus");
const appScreen = document.getElementById("appScreen");

const feedButton = document.getElementById("feedButton");
const feedStatus = document.getElementById("feedStatus");

const temperatureDisplay = document.getElementById("temperature");
const temperatureStatus = document.getElementById("temperature-status");

const espStatus = document.getElementById("espStatus");
const sensorStatus = document.getElementById("sensorStatus");
const feederStatus = document.getElementById("feederStatus");

const feedingTime = document.getElementById("feedingTime");
const scheduleButton = document.getElementById("scheduleButton");
const scheduleStatus = document.getElementById("scheduleStatus");
const nextFeedingTime = document.getElementById("nextFeeding");

const connectionStatus = document.getElementById("connectionStatus");
const connectionText = document.getElementById("connectionText");

// 2. MQTT CONFIGURATION

const feedTopic = "techaquarium/feeder/cmd";
const temperatureTopic = "techaquarium/sensor/temperature";
const heartbeatTopic = "techaquarium/status/heartbeat";
const scheduleTopic = "techaquarium/feederschedule";

const broker =
    "wss://df8a0c1a72354a6fb5ad02c3902b1df8.s1.eu.hivemq.cloud:8884/mqtt";

// Set up a dedicated MQTT account with limited permissions.
// Do not use administrator credentials in a public website.

const options = {
    username: "TechAquarium-Web",
    password: "sandihpelitebook",
    clientId: "TechAquarium-Web-" + Math.random().toString(16).slice(2, 10),
    clean: true,
    connectTimeout: 10000,
    reconnectPeriod: 3000
};

// 3. SYSTEM VARIABLES

let client = null;
let lastHeartbeat = 0;
let lastTemperature = 0;
let mqttConnected = false;
let espOnline = false;
let feedingInProgress = false;

// 4. STATUS HELPER

function setStatus(element, text, online) {
    if (!element) return;


    element.textContent = text;
    element.classList.toggle("online", Boolean(online));
    element.classList.toggle("offline", !online);


}

// 5. CONNECTION STATUS

function updateConnectionStatus() {
    const systemOnline = mqttConnected && espOnline;


    setStatus(
        connectionStatus,
        systemOnline ? "System Online" : "System Offline",
        systemOnline
    );

    if (connectionText) {
        if (systemOnline) {
            connectionText.textContent = "System Online";
        } else if (mqttConnected) {
            connectionText.textContent = "ESP32 Offline";
        } else {
            connectionText.textContent = "MQTT Disconnected";
        }
    }


}

// 6. INITIAL STATUS

function initializeStatus() {
    setStatus(espStatus, "Offline", false);
    setStatus(sensorStatus, "Waiting", false);
    setStatus(feederStatus, "Offline", false);


    updateConnectionStatus();

    if (temperatureStatus) {
        temperatureStatus.textContent = "Waiting for sensor...";
    }

    if (feedStatus) {
        feedStatus.textContent = "Feeder ready";
    }

    if (scheduleStatus) {
        scheduleStatus.textContent = "No schedule sent";
    }


}

initializeStatus();

// 7. LOGIN

if (loginForm) {
    loginForm.addEventListener("submit", function (event) {
        event.preventDefault();


        const username = loginUsername
            ? loginUsername.value.trim()
            : "";

        if (!username) {
            if (loginStatus) {
                loginStatus.textContent = "Please enter your name.";
            }

            if (loginUsername) {
                loginUsername.focus();
            }

            return;
        }

        if (loginStatus) {
            loginStatus.textContent = "Welcome, " + username + "!";
        }

        if (loginButton) {
            loginButton.disabled = true;
            loginButton.textContent = "Opening dashboard...";
        }

        setTimeout(function () {
            if (loginScreen) {
                loginScreen.hidden = true;
            }

            if (appScreen) {
                appScreen.hidden = false;
            }

            document.body.classList.add("dashboard-active");

            if (loginButton) {
                loginButton.disabled = false;
                loginButton.textContent = "Enter Dashboard";
            }
        }, 500);
    });


}

// 8. MQTT CONNECTION

function connectMQTT() {
    if (typeof mqtt === "undefined") {
        console.error("MQTT library is missing.");


        if (loginStatus) {
            loginStatus.textContent =
                "MQTT library not loaded. Check your HTML.";
        }

        return;
    }

    if (
        options.username === "YOUR_MQTT_USERNAME" ||
        options.password === "YOUR_NEW_MQTT_PASSWORD" ||
        !options.username ||
        !options.password
    ) {
        console.warn("MQTT credentials need configuration.");
        return;
    }

    client = mqtt.connect(broker, options);

    client.on("connect", function () {
        console.log("Connected to HiveMQ.");

        mqttConnected = true;
        updateConnectionStatus();

        client.subscribe(
            [temperatureTopic, heartbeatTopic],
            function (error) {
                if (error) {
                    console.error("MQTT subscription error:", error);
                } else {
                    console.log("Subscribed to dashboard topics.");
                }
            }
        );
    });

    client.on("message", function (topic, message) {
        const data = message.toString().trim();

        // TEMPERATURE

        if (topic === temperatureTopic) {
            const temperature = Number(data);

            if (data !== "" && Number.isFinite(temperature)) {
                lastTemperature = Date.now();

                if (temperatureDisplay) {
                    temperatureDisplay.textContent =
                        temperature.toFixed(1) + " °C";
                }

                if (temperatureStatus) {
                    temperatureStatus.textContent = "Live sensor data";
                }

                setStatus(sensorStatus, "Online", true);
            }
        }

        // ESP32 HEARTBEAT

        if (topic === heartbeatTopic) {
            lastHeartbeat = Date.now();

            if (data.toUpperCase() === "ONLINE") {
                espOnline = true;

                setStatus(espStatus, "Online", true);
                setStatus(feederStatus, "Ready", true);

                console.log("ESP32 Online.");
            } else if (data.toUpperCase() === "OFFLINE") {
                espOnline = false;

                setStatus(espStatus, "Offline", false);
                setStatus(feederStatus, "Offline", false);

                console.log("ESP32 Offline.");
            }

            updateConnectionStatus();
        }
    });

    client.on("error", function (error) {
        console.error("MQTT error:", error);
    });

    client.on("reconnect", function () {
        console.log("Reconnecting to HiveMQ...");
    });

    client.on("offline", function () {
        mqttConnected = false;
        updateConnectionStatus();

        console.warn("MQTT connection offline.");
    });

    client.on("close", function () {
        mqttConnected = false;
        updateConnectionStatus();
    });

    client.on("end", function () {
        mqttConnected = false;
        updateConnectionStatus();
    });


}

connectMQTT();

// 9. DEVICE AND SENSOR TIMEOUT

setInterval(function () {
    const now = Date.now();


    if (
        lastHeartbeat === 0 ||
        now - lastHeartbeat > 10000
    ) {
        espOnline = false;

        setStatus(espStatus, "Offline", false);
        setStatus(feederStatus, "Offline", false);
    }

    if (
        lastTemperature === 0 ||
        now - lastTemperature > 5000
    ) {
        setStatus(sensorStatus, "Waiting", false);

        if (temperatureStatus) {
            temperatureStatus.textContent = "Waiting for sensor...";
        }
    }

    updateConnectionStatus();


}, 1000);

// 10. FEED NOW

if (feedButton) {
    feedButton.addEventListener("click", function () {
        if (!client || !client.connected) {
            if (feedStatus) {
                feedStatus.textContent = "MQTT connection unavailable.";
            }


            return;
        }

        if (!espOnline) {
            if (feedStatus) {
                feedStatus.textContent = "ESP32 is offline.";
            }

            return;
        }

        if (feedingInProgress) {
            return;
        }

        feedingInProgress = true;
        feedButton.disabled = true;
        feedButton.textContent = "SENDING...";

        if (feedStatus) {
            feedStatus.textContent = "Sending feeding command...";
        }

        client.publish(
            feedTopic,
            "FEED",
            { qos: 1 },
            function (error) {
                if (error) {
                    console.error("Failed to send feeding command:", error);

                    if (feedStatus) {
                        feedStatus.textContent =
                            "Failed to send feeding command.";
                    }

                    feedingInProgress = false;
                    feedButton.disabled = false;
                    feedButton.textContent = "FEED NOW";

                    return;
                }

                feedButton.textContent = "COMMAND SENT";

                if (feedStatus) {
                    feedStatus.textContent =
                        "Command sent. Waiting for device.";
                }

                setTimeout(function () {
                    feedingInProgress = false;
                    feedButton.disabled = false;
                    feedButton.textContent = "FEED NOW";

                    if (feedStatus) {
                        feedStatus.textContent = espOnline
                            ? "Feeder ready"
                            : "ESP32 is offline.";
                    }
                }, 3000);
            }
        );
    });


}

// 11. FEEDING SCHEDULE

if (scheduleButton) {
    scheduleButton.addEventListener("click", function () {
        const time = feedingTime ? feedingTime.value : "";


        if (!time) {
            if (scheduleStatus) {
                scheduleStatus.textContent =
                    "Please select a feeding time.";
            }

            return;
        }

        if (!client || !client.connected) {
            if (scheduleStatus) {
                scheduleStatus.textContent =
                    "MQTT connection unavailable.";
            }

            return;
        }

        if (!espOnline) {
            if (scheduleStatus) {
                scheduleStatus.textContent = "ESP32 is offline.";
            }

            return;
        }

        scheduleButton.disabled = true;

        if (scheduleStatus) {
            scheduleStatus.textContent = "Sending schedule...";
        }

        client.publish(
            scheduleTopic,
            time,
            { qos: 1 },
            function (error) {
                scheduleButton.disabled = false;

                if (error) {
                    console.error("Failed to send schedule:", error);

                    if (scheduleStatus) {
                        scheduleStatus.textContent =
                            "Failed to send schedule.";
                    }

                    return;
                }

                if (nextFeedingTime) {
                    nextFeedingTime.textContent = time;
                }

                if (scheduleStatus) {
                    scheduleStatus.textContent =
                        "Schedule command sent.";
                }

                console.log("Schedule command sent:", time);
            }
        );
    });


}

// 12. CLEANUP

window.addEventListener("beforeunload", function () {
    if (client) {
        client.end(true);
    }
});
