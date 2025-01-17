function extractTweetId(url) {
    const regex = /(?:https?:\/\/)?(?:www\.)?(?:twitter\.com|x\.com)\/(?:\S+)\/status\/(\d+)/;
    const match = url.match(regex);
    return match ? match[1] : null;
}

// Add event listener for the Summarize button
document.getElementById("summarizeBtn").addEventListener("click", async () => {
    const tweetUrl = document.getElementById("tweetUrl").value;
    const tweetId = extractTweetId(tweetUrl);

    if (!tweetId) {
        document.getElementById("output").textContent = "Invalid Tweet URL!";
        return;
    }

    document.getElementById("output").textContent = "Fetching Tweet...";

    // Send message to background script
    chrome.runtime.sendMessage({ action: "fetchTweet", tweetId }, (response) => {
        if (response.error) {
            document.getElementById("output").textContent = `Error: ${response.error}`;
        } else {
            document.getElementById("output").textContent = `Tweet: ${response.data}`;
        }
    });
});
