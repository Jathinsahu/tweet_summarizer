const endpointURL = "https://api.twitter.com/2/tweets";
const token = 'AAAAAAAAAAAAAAAAAAAAALuxxQEAAAAAZyEYYsiePqB7jZrLYFV4VEipUIY%3Dvevmqfh34PBABXU9GOGxL0KhYbrD7sF886Ven28fFbYNcOXRlV'; // Replace with your actual Twitter Bearer Token

// Function to make API requests to fetch tweet data
async function getTweetData(tweetId, retries = 3) {
  const params = new URLSearchParams({
    "ids": tweetId,
    "tweet.fields": "note_tweet",
  });

  try {
    const response = await fetch(`${endpointURL}?${params.toString()}`, {
      method: 'GET',
      headers: {
        "User-Agent": "v2TweetFetcher",
        "Authorization": `Bearer ${token}`,
      }
    });

    console.log("Response Status Code:", response.status);
    console.log("Rate Limit Remaining:", response.headers.get("X-RateLimit-Remaining"));

    if (response.status === 429) {
      const resetTime = response.headers.get("X-RateLimit-Reset");

      if (resetTime) {
        const resetTimestamp = parseInt(resetTime);
        const currentTimestamp = Math.floor(Date.now() / 1000);
        const waitTime = Math.max(0, resetTimestamp - currentTimestamp) + 1; // Adding a second to ensure the limit is reset

        console.log(`Rate limit hit. Waiting for ${waitTime} seconds to retry...`);

        // Wait until the rate limit reset time
        await new Promise(resolve => setTimeout(resolve, waitTime * 1000));

        // Retry after the wait
        return getTweetData(tweetId, retries - 1);
      } else {
        throw new Error("Rate limit reached and reset time not provided.");
      }
    }

    if (!response.ok) {
      throw new Error(`Request failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching tweet data:", error.message);

    if (retries > 0) {
      console.log(`Retrying... Attempts left: ${retries}`);
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for 2 seconds before retrying
      return getTweetData(tweetId, retries - 1);
    } else {
      console.log("Retries exhausted. Giving up.");
      return { error: "Retries exhausted, failed to fetch tweet data." };
    }
  }
}


// Function to summarize content using Google Gemini API
async function summarizeContent(query) {
  const apiKey = "AIzaSyAglKsF7I1N45AqqXwC7EXrEiYEMceTYa4"; // Replace with your actual Google API key
  const endpoint = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";

  try {
    const response = await fetch(`${endpoint}?key=${apiKey}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `Summarize it into very small and simple points: ${query}` }] }],
      }),
    });

    const result = await response.json();

    if (result.candidates && result.candidates.length > 0) {
      return result.candidates[0].content.parts[0];
    } else {
      console.error("Unexpected response format:", result);
      return "Error summarizing content.";
    }
  } catch (error) {
    console.error("Error summarizing content:", error.message);
    return "Error summarizing content.";
  }
}

// Listen for messages from popup or content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "fetchTweet") {
    const tweetId = message.tweetId;

    (async () => {
      try {
        const result = await getTweetData(tweetId);

        if (result.data && result.data.length > 0) {
          const tweet = result.data[0];
          if (tweet.note_tweet && tweet.note_tweet.text) {
            const query = tweet.note_tweet.text.replace(/\\n/g, '\n');
            console.log("Summarizing tweet content...");
            const summarizedContent = await summarizeContent(query);

            console.log("Summarized Content:", summarizedContent);
            sendResponse({ data: summarizedContent }); // Send back summarized content
          } else {
            sendResponse({ error: "No tweet content available to summarize." });
          }
        } else {
          sendResponse({ error: "No tweet data returned." });
        }
      } catch (e) {
        sendResponse({ error: e.message });
      }
    })();

    return true; // Keep the message port open for async response
  }
});


