const feedButton = document.getElementById("feedButton");
const feedStatus = document.getElementById("feedStatus");

const feedTopic = "techaquarium/feeder/cmd";

const broker = "wss://df8a0c1a72354a6fb5ad02c3902b1df8.s1.eu.hivemq.cloud:8884/mqtt";

const options = {
    username: "TechAquarium",
    password: "",
    clientId: "TechAquarium-Web-" + Math.random().toString(16).substr(2, 8)
};

const client = mqtt.connect(broker, options);

client.on("connect", function() {
    console.log("✅ Connected to HiveMQ");
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