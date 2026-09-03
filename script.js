const feedButton = document.getElementById("feedButton");
const feedStatus = document.getElementById("feedStatus");

const temperatureDisplay = document.getElementById("temperature");
const temperatureStatus = document.getElementById("temperature-status");

const espStatus = document.getElementById("espStatus");
const sensorStatus = document.getElementById("sensorStatus");
const feederStatus = document.getElementById("feederStatus");

const feedTopic = "techaquarium/feeder/cmd";
const temperatureTopic = "techaquarium/sensor/temperature";
const heartbeatTopic = "techaquarium/status/heartbeat";

const broker = "wss://df8a0c1a72354a6fb5ad02c3902b1df8.s1.eu.hivemq.cloud:8884/mqtt";

const options = {
    username: "TechAquarium-Web",
    password: "sandihpelitebook",
    clientId: "TechAquarium-Web-" + Math.random().toString(16).substr(2, 8)
};

const client = mqtt.connect(broker, options);

let lastHeartbeat = 0;
let lastTemperature = 0;

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

client.on("connect", function() {
    console.log("✅ Connected to HiveMQ");

    client.subscribe(temperatureTopic, function(error) {
        if (error) {
            console.error("❌ Temperature subscribe error:", error);
        } else {
            console.log("🌡️ Subscribed to temperature");
        }
    });

    client.subscribe(heartbeatTopic, function(error) {
        if (error) {
            console.error("❌ Heartbeat subscribe error:", error);
        } else {
            console.log("💓 Subscribed to heartbeat");
        }
    });
});

client.on("message", function(topic, message) {

    const data = message.toString();

    if (topic === temperatureTopic) {

        const temperature = parseFloat(data);

        if (!isNaN(temperature)) {
            temperatureDisplay.textContent = temperature.toFixed(1) + " °C";
            temperatureStatus.textContent = "Live sensor data";

            lastTemperature = Date.now();

            setStatus(sensorStatus, "Online", true);
        }
    }

    if (topic === heartbeatTopic) {

        lastHeartbeat = Date.now();

        if (data === "ONLINE") {
            setStatus(espStatus, "Online", true);
            setStatus(feederStatus, "Ready", true);

            console.log("🟢 ESP32 Online");
        }

        if (data === "OFFLINE") {
            setStatus(espStatus, "Offline", false);
            setStatus(feederStatus, "Offline", false);

            console.log("🔴 ESP32 Offline");
        }
    }
});

client.on("error", function(error) {
    console.error("❌ MQTT Error:", error);
});

client.on("reconnect", function() {
    console.log("🔄 Reconnecting to HiveMQ...");
});

client.on("offline", function() {
    console.log("⚠️ MQTT Offline");
});

setInterval(function() {

    const now = Date.now();

    if (now - lastHeartbeat > 10000) {
        setStatus(espStatus, "Offline", false);
        setStatus(feederStatus, "Offline", false);
    }

    if (now - lastTemperature > 5000) {
        setStatus(sensorStatus, "Waiting", false);
        temperatureStatus.textContent = "Waiting for sensor...";
    }

}, 1000);

feedButton.addEventListener("click", function() {

    if (!client.connected) {
        feedStatus.textContent = "⚠️ Feeder connection unavailable";
        return;
    }

    client.publish(feedTopic, "FEED");

    feedButton.textContent = "FEEDING...";
    feedButton.disabled = true;

    feedStatus.textContent = "🐟 Feeding command sent";

    setTimeout(function() {

        feedButton.textContent = "FEED NOW";
        feedButton.disabled = false;

        feedStatus.textContent = "Feeder ready";

    }, 3000);

});