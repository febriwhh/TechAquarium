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

const feedTopic = "techaquarium/feeder/cmd";
const temperatureTopic = "techaquarium/sensor/temperature";
const heartbeatTopic = "techaquarium/status/heartbeat";
const scheduleTopic = "techaquarium/feederschedule";

const broker =
    "wss://df8a0c1a72354a6fb5ad02c3902b1df8.s1.eu.hivemq.cloud:8884/mqtt";

const options = {
    username: "TechAquarium-Web",
    password: "sandihpelitebook",
    clientId: "TechAquarium-Web-" + Math.random().toString(16).substr(2, 8)
};

const client = mqtt.connect(broker, options);

let lastHeartbeat = 0;
let lastTemperature = 0;


// ========================================
// STATUS HELPER
// ========================================

function setStatus(element, text, online) {
    element.textContent = text;

    if (online) {
        element.classList.remove("offline");
        element.classList.add("online");
    } else {
        element.classList.remove("online");
        element.classList.add("offline");
    }
}


// ========================================
// HEADER CONNECTION STATUS
// ========================================

function updateConnectionStatus() {
    if (!connectionStatus || !connectionText) {
        return;
    }

    const isOnline = espStatus.classList.contains("online");

    if (isOnline) {
        connectionStatus.classList.remove("offline");
        connectionStatus.classList.add("online");

        connectionText.textContent = "System Online";
    } else {
        connectionStatus.classList.remove("online");
        connectionStatus.classList.add("offline");

        connectionText.textContent = "System Offline";
    }
}


// ========================================
// MQTT CONNECTION
// ========================================

client.on("connect", function () {
    console.log("✅ Connected to HiveMQ");

    client.subscribe(temperatureTopic, function (error) {
        if (error) {
            console.error("❌ Temperature subscribe error:", error);
        } else {
            console.log("🌡️ Subscribed to temperature");
        }
    });

    client.subscribe(heartbeatTopic, function (error) {
        if (error) {
            console.error("❌ Heartbeat subscribe error:", error);
        } else {
            console.log("💓 Subscribed to heartbeat");
        }
    });
});


// ========================================
// MQTT MESSAGE
// ========================================

client.on("message", function (topic, message) {

    const data = message.toString().trim();

    // ------------------------------------
    // TEMPERATURE
    // ------------------------------------

    if (topic === temperatureTopic) {

        const temperature = parseFloat(data);

        if (!isNaN(temperature)) {

            temperatureDisplay.textContent =
                temperature.toFixed(1) + " °C";

            temperatureStatus.textContent =
                "Live sensor data";

            lastTemperature = Date.now();

            setStatus(
                sensorStatus,
                "Online",
                true
            );
        }
    }


    // ------------------------------------
    // HEARTBEAT
    // ------------------------------------

    if (topic === heartbeatTopic) {

        lastHeartbeat = Date.now();

        if (data === "ONLINE") {

            setStatus(
                espStatus,
                "Online",
                true
            );

            setStatus(
                feederStatus,
                "Ready",
                true
            );

            console.log("🟢 ESP32 Online");

            updateConnectionStatus();
        }


        if (data === "OFFLINE") {

            setStatus(
                espStatus,
                "Offline",
                false
            );

            setStatus(
                feederStatus,
                "Offline",
                false
            );

            console.log("🔴 ESP32 Offline");

            updateConnectionStatus();
        }
    }
});


// ========================================
// MQTT ERROR
// ========================================

client.on("error", function (error) {
    console.error("❌ MQTT Error:", error);
});


// ========================================
// MQTT RECONNECT
// ========================================

client.on("reconnect", function () {
    console.log("🔄 Reconnecting to HiveMQ...");
});


// ========================================
// MQTT OFFLINE
// ========================================

client.on("offline", function () {
    console.log("⚠️ MQTT Offline");
});


// ========================================
// HEARTBEAT & SENSOR TIMEOUT CHECK
// ========================================

setInterval(function () {

    const now = Date.now();


    // ------------------------------------
    // ESP32 HEARTBEAT TIMEOUT
    // ------------------------------------

    if (now - lastHeartbeat > 10000) {

        setStatus(
            espStatus,
            "Offline",
            false
        );

        setStatus(
            feederStatus,
            "Offline",
            false
        );

        updateConnectionStatus();
    }


    // ------------------------------------
    // TEMPERATURE SENSOR TIMEOUT
    // ------------------------------------

    if (now - lastTemperature > 5000) {

        setStatus(
            sensorStatus,
            "Waiting",
            false
        );

        temperatureStatus.textContent =
            "Waiting for sensor...";
    }

}, 1000);


// ========================================
// FEED NOW
// ========================================

feedButton.addEventListener("click", function () {

    if (!client.connected) {

        feedStatus.textContent =
            "⚠️ Feeder connection unavailable";

        return;
    }

    if (!espStatus.classList.contains("online")) {

        feedStatus.textContent =
            "⚠️ ESP32 is offline";

        return;
    }

    client.publish(
        feedTopic,
        "FEED"
    );

    feedButton.textContent =
        "FEEDING...";

    feedButton.disabled = true;

    feedStatus.textContent =
        "🐟 Feeding command sent";


    setTimeout(function () {

        feedButton.textContent =
            "FEED NOW";

        feedButton.disabled = false;

        feedStatus.textContent =
            "Feeder ready";

    }, 3000);
});


// ========================================
// FEEDING SCHEDULE
// ========================================

scheduleButton.addEventListener("click", function () {

    const time = feedingTime.value;


    if (!time) {

        scheduleStatus.textContent =
            "⚠️ Please select feeding time";

        return;
    }


    if (!client.connected) {

        scheduleStatus.textContent =
            "⚠️ Feeder connection unavailable";

        return;
    }


    if (!espStatus.classList.contains("online")) {

        scheduleStatus.textContent =
            "⚠️ ESP32 is offline";

        return;
    }


    client.publish(
        scheduleTopic,
        time
    );

    nextFeedingTime.textContent =
        time;

    scheduleStatus.textContent =
        "⏰ Schedule active";

    console.log(
        "⏰ Feeding schedule sent:",
        time
    );
});


// ========================================
// INITIAL STATUS
// ========================================

setStatus(
    espStatus,
    "Offline",
    false
);

setStatus(
    sensorStatus,
    "Waiting",
    false
);

setStatus(
    feederStatus,
    "Offline",
    false
);

updateConnectionStatus();