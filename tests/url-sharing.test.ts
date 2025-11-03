/**
 * Tests for URL Sharing Strategy
 * 
 * Run with: npm test -- url-sharing.test.ts
 */

import { describe, it, expect } from 'vitest';
import { parseServerReference, createServerReference, encodeArgs, decodeArgs } from '../src/hooks/useURLState';

describe('URL Sharing - Server References', () => {
  it('should parse basic server reference correctly', () => {
    const ref = 'weather-api:https://api.weather.com/mcp';
    const parsed = parseServerReference(ref);

    expect(parsed).toEqual({
      name: 'weather-api',
      url: 'https://api.weather.com/mcp',
    });
  });

  it('should handle URLs with multiple colons', () => {
    const ref = 'my-server:http://localhost:3000/mcp';
    const parsed = parseServerReference(ref);

    expect(parsed).toEqual({
      name: 'my-server',
      url: 'http://localhost:3000/mcp',
    });
  });

  it('should handle server names with special characters', () => {
    const name = 'My Server (Production)';
    const url = 'https://api.example.com/mcp';
    const ref = createServerReference(name, url);
    const parsed = parseServerReference(ref);

    expect(parsed).toEqual({ name, url });
  });

  it('should handle server names with colons', () => {
    const name = 'Server: Production';
    const url = 'https://api.example.com/mcp';
    const ref = createServerReference(name, url);
    const parsed = parseServerReference(ref);

    expect(parsed).toEqual({ name, url });
  });

  it('should handle server names with spaces', () => {
    const name = 'Weather API Server';
    const url = 'https://api.example.com/mcp';
    const ref = createServerReference(name, url);
    const parsed = parseServerReference(ref);

    expect(parsed).toEqual({ name, url });
  });

  it('should handle URLs with query parameters', () => {
    const name = 'my-server';
    const url = 'https://api.example.com/mcp?key=value&other=123';
    const ref = createServerReference(name, url);
    const parsed = parseServerReference(ref);

    expect(parsed).toEqual({ name, url });
  });

  it('should handle URLs with fragments', () => {
    const name = 'my-server';
    const url = 'https://api.example.com/mcp#section';
    const ref = createServerReference(name, url);
    const parsed = parseServerReference(ref);

    expect(parsed).toEqual({ name, url });
  });

  it('should handle URLs with authentication', () => {
    const name = 'my-server';
    const url = 'https://user:pass@api.example.com/mcp';
    const ref = createServerReference(name, url);
    const parsed = parseServerReference(ref);

    expect(parsed).toEqual({ name, url });
  });

  it('should handle server names with emoji', () => {
    const name = '🌤️ Weather API';
    const url = 'https://api.example.com/mcp';
    const ref = createServerReference(name, url);
    const parsed = parseServerReference(ref);

    expect(parsed).toEqual({ name, url });
  });

  it('should handle server names with special URL characters', () => {
    const name = 'Server & Tools';
    const url = 'https://api.example.com/mcp';
    const ref = createServerReference(name, url);
    const parsed = parseServerReference(ref);

    expect(parsed).toEqual({ name, url });
  });

  it('should return null for invalid references', () => {
    expect(parseServerReference('')).toBeNull();
    expect(parseServerReference('no-colon')).toBeNull();
  });

  it('should create server reference correctly', () => {
    const ref = createServerReference('weather-api', 'https://api.weather.com/mcp');
    expect(ref).toContain('weather-api');
    expect(ref).toContain('https://api.weather.com/mcp');
  });

  it('should throw error for empty name or url', () => {
    expect(() => createServerReference('', 'https://example.com')).toThrow();
    expect(() => createServerReference('name', '')).toThrow();
  });

  it('should round-trip complex names and URLs', () => {
    const testCases = [
      { name: 'Simple Server', url: 'https://example.com' },
      { name: 'Server: Production', url: 'http://localhost:3000' },
      { name: 'Server (v2)', url: 'https://api.example.com/mcp?key=value' },
      { name: 'My:Special:Server', url: 'https://example.com:8080/path' },
      { name: '🌤️ Weather', url: 'https://weather.com/api' },
    ];

    for (const testCase of testCases) {
      const ref = createServerReference(testCase.name, testCase.url);
      const parsed = parseServerReference(ref);
      expect(parsed).toEqual(testCase);
    }
  });
});

describe('URL Sharing - Args Encoding', () => {
  it('should encode and decode args correctly', () => {
    const args = { city: 'San Francisco', units: 'metric' };
    const encoded = encodeArgs(args);
    const decoded = decodeArgs(encoded);

    expect(decoded).toEqual(args);
  });

  it('should handle complex nested args', () => {
    const args = {
      query: 'test',
      options: {
        limit: 10,
        filters: ['a', 'b', 'c'],
      },
    };
    const encoded = encodeArgs(args);
    const decoded = decodeArgs(encoded);

    expect(decoded).toEqual(args);
  });

  it('should handle empty args', () => {
    const args = {};
    const encoded = encodeArgs(args);
    const decoded = decodeArgs(encoded);

    expect(decoded).toEqual(args);
  });

  it('should return null for invalid encoded string', () => {
    expect(decodeArgs('invalid-base64!!!')).toBeNull();
  });

  it('should handle args with special characters', () => {
    const args = { message: 'Hello & goodbye!', value: 'a=b&c=d' };
    const encoded = encodeArgs(args);
    const decoded = decodeArgs(encoded);

    expect(decoded).toEqual(args);
  });
});

describe('URL Sharing - Integration', () => {
  it('should create a complete shareable URL', () => {
    const serverName = 'weather-api';
    const serverUrl = 'https://api.weather.com/mcp';
    const toolName = 'get_forecast';
    const args = { city: 'SF' };

    const serverRef = createServerReference(serverName, serverUrl);
    const encodedArgs = encodeArgs(args);

    const url = new URL('https://hoot.app/test');
    url.searchParams.set('s', serverRef);
    url.searchParams.set('tool', toolName);
    url.searchParams.set('args', encodedArgs);

    expect(url.searchParams.get('s')).toContain('weather-api');
    expect(url.searchParams.get('tool')).toBe(toolName);

    // Verify we can parse it back
    const parsedServerRef = url.searchParams.get('s');
    const server = parseServerReference(parsedServerRef!);
    expect(server).toEqual({
      name: serverName,
      url: serverUrl,
    });
  });

  it('should parse a shared URL correctly', () => {
    const urlString = 'https://hoot.app/test?s=weather-api:https://api.weather.com/mcp&tool=get_forecast&args=eyJjaXR5IjoiU0YifQ==';
    const url = new URL(urlString);

    const serverRef = url.searchParams.get('s');
    const toolName = url.searchParams.get('tool');
    const argsEncoded = url.searchParams.get('args');

    expect(serverRef).toBe('weather-api:https://api.weather.com/mcp');
    expect(toolName).toBe('get_forecast');

    const server = parseServerReference(serverRef!);
    expect(server).toEqual({
      name: 'weather-api',
      url: 'https://api.weather.com/mcp',
    });

    const args = decodeArgs(argsEncoded!);
    expect(args).toEqual({ city: 'SF' });
  });

  it('should handle complex server names in full URL flow', () => {
    const serverName = 'Production: Weather API (v2)';
    const serverUrl = 'https://api.weather.com:8080/mcp?version=2';
    const toolName = 'get_forecast';

    const serverRef = createServerReference(serverName, serverUrl);

    // Simulate browser URL encoding
    const url = new URL('https://hoot.app/test');
    url.searchParams.set('s', serverRef);
    url.searchParams.set('tool', toolName);

    // Simulate receiving the URL
    const receivedUrl = url.toString();
    const parsedUrl = new URL(receivedUrl);

    const receivedServerRef = parsedUrl.searchParams.get('s');
    const receivedServer = parseServerReference(receivedServerRef!);

    expect(receivedServer).toEqual({
      name: serverName,
      url: serverUrl,
    });
    expect(parsedUrl.searchParams.get('tool')).toBe(toolName);
  });
});

