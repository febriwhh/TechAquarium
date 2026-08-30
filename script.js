const feedButton = document.getElementById("feedButton");
const feedStatus = document.getElementById("feedStatus");

feedButton.addEventListener("click", function() {

    feedButton.textContent = "FEEDING...";
    feedButton.disabled = true;

    feedStatus.textContent = "🐟 Fish are being fed...";

    setTimeout(function() {

        feedButton.textContent = "FEED NOW";
        feedButton.disabled = false;

        feedStatus.textContent = "Feeder ready";

    }, 3000);

});