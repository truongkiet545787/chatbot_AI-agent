exports.handler = async function (event, context) {
  // CORS Headers
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json"
  };

  // Handle preflight OPTIONS request
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: "Successful preflight call" })
    };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "Method Not Allowed" })
    };
  }

  try {
    const data = JSON.parse(event.body);
    const messages = data.messages || [];

    if (!messages || messages.length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Không nhận được lịch sử tin nhắn." })
      };
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: "Chưa cấu hình OPENAI_API_KEY trên Netlify." })
      };
    }

    // Call OpenRouter API using built-in fetch in Node.js 18+
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://medpregnancy.netlify.app",
        "X-Title": "MedPregnancy"
      },
      body: JSON.stringify({
        model: "openrouter/free", // Automatical free model fallback
        messages: messages
      })
    });

    const resJson = await response.json();
    
    if (!response.ok) {
      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify({ error: resJson.error?.message || "Lỗi kết nối OpenRouter." })
      };
    }

    const aiContent = resJson.choices[0].message.content;
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        content: aiContent,
        role: "assistant"
      })
    };
  } catch (error) {
    console.error("Error in Netlify Function:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message || "Lỗi hệ thống nội bộ." })
    };
  }
};
