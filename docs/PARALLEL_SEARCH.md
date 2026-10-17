# Test Parallel Search MCP in Hoot

Use [Parallel Search MCP](https://docs.parallel.ai/integrations/mcp/search-mcp) to try a real remote MCP server: search the web, inspect source excerpts, and fetch a page. The anonymous endpoint is free for exploration and light use, with no account or API key required. Anonymous searches use Fast mode.

This walkthrough uses Hoot's tool testing interface, so you do not need to configure an LLM or use chat.

## Connect to the server

Open [hoot.run](https://hoot.run), or run Hoot locally using the [Quick Start Guide](QUICKSTART.md).

1. Click **Add Server**. If the welcome screen appears first, click **Get Started**.
2. Enter `https://search.parallel.ai/mcp` as the **Server URL** and click **Detect Server**.
3. In **Configure Server**, check these settings:

   | Setting | Value |
   | --- | --- |
   | Server Name | Any descriptive name, such as `Parallel Search` |
   | Transport | **HTTP** (Streamable HTTP) |
   | Authentication | **None** |

4. Click **Add Server** in the configuration form. The server's tool list should include `web_search` and `web_fetch`.

Use the `/mcp` URL above for anonymous access. The separate `/mcp-oauth` endpoint requires authentication.

## Search the web

1. Select `web_search` in the tools sidebar.
2. Under **Input Parameters**, choose **JSON** and replace the editor contents with:

   ```json
   {
     "objective": "Find the official Model Context Protocol documentation explaining Streamable HTTP transport.",
     "search_queries": [
       "MCP Streamable HTTP transport documentation"
     ]
   }
   ```

3. Click **Execute Tool**.
4. Inspect **Response** for source URLs and excerpts. Use **Request** to check the input you sent and **Raw JSON** to inspect the complete execution result.

The `objective` describes the information you want; `search_queries` is an array of keyword queries, even when you send only one. Both are required for `web_search`. Results can change as web content changes.

## Fetch a page

Select `web_fetch`, switch to **JSON**, and replace the editor contents with:

```json
{
  "urls": ["https://modelcontextprotocol.io/specification/2025-03-26/basic/transports"],
  "objective": "Explain the Streamable HTTP request and response requirements."
}
```

Click **Execute Tool** and inspect the returned page excerpts. You can also replace the URL with a relevant source from your search results. `urls` must be an array; `objective` is optional for `web_fetch`. Leave `full_content` unset for focused excerpts, or set it to `true` when you need the full page markdown.

## Troubleshooting

- **Asked to sign in:** Check that the URL ends in `/mcp`, rather than `/mcp-oauth`, and that **Authentication** is **None**.
- **No tools listed:** Check the server connection, URL, and **HTTP** transport. See [Troubleshooting](TROUBLESHOOTING.md) for connection help.
- **Invalid parameters:** Replace the entire JSON input when switching tools. `web_search` needs `objective` and `search_queries`; `web_fetch` needs `urls`.
- **Rate or usage limit:** Anonymous access has lower limits. Wait before retrying, or see the [Parallel Search MCP setup](https://docs.parallel.ai/integrations/mcp/search-mcp) for authenticated access with higher limits.
