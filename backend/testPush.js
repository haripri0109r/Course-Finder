const sendTestPush = async () => {
  try {
    const response = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        // ⚠️ PASTE THE TOKEN LOGGED FROM YOUR FRONTEND TERMINAL HERE ⚠️
        to: "PASTE_YOUR_TOKEN_HERE", 
        sound: "default",
        title: "TEST 🔥",
        body: "If you see this → push works",
      }),
    });

    const data = await response.json();
    console.log("EXPO RESPONSE:", data);
  } catch (err) {
    console.log("ERROR:", err);
  }
};

sendTestPush();
