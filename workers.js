export default {
    async fetch(request, env) {
      const url = new URL(request.url);
  
      const corsHeaders = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, x-api-key"
      };
  
      if (request.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
      }
  
      // ================= AUTH =================
      const apiKey = request.headers.get("x-api-key");
      if (!apiKey) {
        return new Response("MISSING_API_KEY", { status: 401, headers: corsHeaders });
      }
  
      const userId = await env.TRANSFER_STORES.get(`api:${apiKey}`);
      if (!userId) {
        return new Response("INVALID_API_KEY", { status: 401, headers: corsHeaders });
      }
  
      // ================= SEND =================
      if (url.pathname === "/send" && request.method === "POST") {
  
        const body = await request.json().catch(() => null);
  
        if (!body || !body.payload) {
          return new Response("INVALID_BODY", { status: 400, headers: corsHeaders });
        }
  
        const payloadSize = JSON.stringify(body.payload).length;
        if (payloadSize > 50000) {
          return new Response("PAYLOAD_TOO_LARGE", { status: 400, headers: corsHeaders });
        }
  
        const messageId = crypto.randomUUID();
  
        await env.TEXT_BUFFER.put(
          `message:${userId}:${messageId}`,
          JSON.stringify({
            payload: body.payload,
            timestamp: Date.now()
          }),
          { expirationTtl: 3600 }
        );
  
        // csak a legutolsó ID-t tároljuk
        await env.TEXT_BUFFER.put(
          `latest:${userId}`,
          messageId,
          { expirationTtl: 3600 }
        );
  
        return new Response(JSON.stringify({
          status: "OK",
          message_id: messageId
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
  
      // ================= NEXT =================
      if (url.pathname === "/next" && request.method === "GET") {
  
        const deviceId = url.searchParams.get("device_id");
        if (!deviceId) {
          return new Response("MISSING_DEVICE_ID", { status: 400, headers: corsHeaders });
        }
  
        const latestId = await env.TEXT_BUFFER.get(`latest:${userId}`);
        if (!latestId) {
          return new Response(JSON.stringify([]), {
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }
  
        const alreadyRead = await env.TEXT_BUFFER.get(
          `read:${userId}:${deviceId}:${latestId}`
        );
  
        if (alreadyRead) {
          return new Response(JSON.stringify([]), {
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }
  
        const data = await env.TEXT_BUFFER.get(
          `message:${userId}:${latestId}`
        );
  
        if (!data) {
          return new Response(JSON.stringify([]), {
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }
  
        const parsed = JSON.parse(data);
  
        return new Response(JSON.stringify([
          {
            message_id: latestId,
            ...parsed
          }
        ]), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
  
      // ================= ACK =================
      if (url.pathname === "/ack" && request.method === "POST") {
  
        const body = await request.json().catch(() => null);
  
        if (!body || !body.device_id || !body.message_id) {
          return new Response("INVALID_BODY", { status: 400, headers: corsHeaders });
        }
  
        await env.TEXT_BUFFER.put(
          `read:${userId}:${body.device_id}:${body.message_id}`,
          "1",
          { expirationTtl: 3600 }
        );
  
        return new Response("ACK_OK", { headers: corsHeaders });
      }
  
      return new Response("Not found", { status: 404, headers: corsHeaders });
    }
  };
  