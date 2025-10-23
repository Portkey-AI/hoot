# Common Tool Execution Issues & Solutions

## Potential Issues

### 1. **CORS Errors**
**Symptom**: `Failed to fetch` or CORS policy error
**Solution**: 
- Server needs `access-control-allow-origin: *` header
- deepwiki already has this, so should work!

### 2. **JSON Parsing Error**
**Symptom**: `Unexpected token` or `JSON parse error`
**Solution**:
- Check if input arguments are valid
- Ensure form values are properly typed (numbers vs strings)

### 3. **Invalid Arguments**
**Symptom**: Server returns error about missing/invalid parameters
**Solution**:
- Check the tool's input schema
- Make sure all required fields are filled
- Check data types match (string vs number)

### 4. **Connection Lost**
**Symptom**: `Server not connected`
**Solution**:
- Reconnect to the server
- Check if session expired

### 5. **Browser Console Errors**
**Symptom**: JavaScript errors in console
**Solution**:
- Open DevTools (F12)
- Check Console tab for detailed error messages
- Look for red error messages

## Debugging Steps

1. **Open Browser DevTools** (F12)
2. **Go to Console tab**
3. **Try executing a tool**
4. **Look for error messages** (we now log detailed info)
5. **Check Network tab** to see the actual HTTP requests

## Example Errors

### ❌ Missing Required Parameter
```
Error: Missing required parameter 'repoName'
```
**Fix**: Fill in all required fields (marked with *)

### ❌ Wrong Data Type
```
Error: Expected string, got number
```
**Fix**: Check if you're using Form mode vs JSON mode

### ❌ Invalid JSON
```
Error: Unexpected token in JSON
```
**Fix**: In JSON mode, ensure valid JSON syntax

### ❌ Network Error
```
Error: Failed to fetch
```
**Fix**: Check internet connection, server URL

## Testing in Browser

To test if tool execution works:

1. Open Screech at http://localhost:3000
2. Add server: `https://mcp.deepwiki.com/mcp` (HTTP transport)
3. Wait for tools to load
4. Click `read_wiki_structure`
5. Fill in: `repoName` = `facebook/react`
6. Click "Execute Tool"
7. Should see result with React documentation structure

## Checking Logs

With the latest update, errors are logged to console with:
- Server ID
- Tool name
- Arguments sent
- Full error message
- Stack trace (if available)

Open DevTools Console to see these details!

