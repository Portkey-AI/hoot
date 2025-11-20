import { memo, useState, useMemo, useEffect } from 'react';
import { CheckCircle2, XCircle, AlertCircle, RefreshCw, Filter, ArrowUpDown, ChevronRight, ChevronDown, ExternalLink, Shield, Key, Globe, Server, Award, FileCheck, Zap, Info, X } from 'lucide-react';
import { useAppStore } from '../stores/appStore';
import * as backendClient from '../lib/backendClient';
import './OAuthComplianceResults.css';

interface ComplianceCheck {
    wwwAuthenticateHeader: boolean;
    rfc9728Metadata: boolean;
    oauthErrorCodes: boolean;
    mcpSdkUnauthorizedError: boolean;
}

interface ServerResult {
    serverName: string;
    url: string;
    timestamp: string;
    compliance: ComplianceCheck;
    details: any;
    score: number;
    status: 'oauth' | 'header_auth' | 'no_auth' | 'error' | 'unknown';
    error?: string;
    iconUrl?: string;
}

interface ComplianceResults {
    metadata: {
        testVersion: string;
        description: string;
        specs: string[];
        startTime: string;
        endTime?: string;
    };
    summary: {
        totalServers: number;
        testedServers: number;
        oauthCompliant: number;
        headerAuth: number;
        noAuth: number;
        errors: number;
    };
    results: ServerResult[];
}

export const OAuthComplianceResults = memo(function OAuthComplianceResults() {
    const [results, setResults] = useState<ComplianceResults | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [sortBy, setSortBy] = useState<'name' | 'score' | 'status'>('score');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [expandedServer, setExpandedServer] = useState<string | null>(null);
    const [selectedSpec, setSelectedSpec] = useState<string | null>(null);

    // Access favicon cache from app store
    const faviconCache = useAppStore((state) => state.faviconCache);
    const setFaviconUrl = useAppStore((state) => state.setFaviconUrl);

    // Detailed information for each spec
    const specDetails: Record<string, { title: string; description: string; implementation: string[]; passCriteria: string[] }> = {
        'RFC 6750 (OAuth 2.0 Bearer Token Usage) - WWW-Authenticate header': {
            title: 'WWW-Authenticate Header (RFC 6750)',
            description: 'When a protected resource receives an unauthorized request, it must respond with a 401 Unauthorized status and include a WWW-Authenticate header that indicates Bearer token authentication is required.',
            implementation: [
                'Return HTTP 401 status code when access token is missing or invalid',
                'Include WWW-Authenticate header in the response',
                'Header format: WWW-Authenticate: Bearer realm="<resource>", scope="<scopes>"',
                'Optionally include error, error_description, and error_uri parameters',
                'Recommended: Include resource_metadata parameter pointing to RFC 9728 metadata endpoint',
                'Example: WWW-Authenticate: Bearer realm="MCP Server", scope="mcp:read mcp:write", resource_metadata="https://example.com/.well-known/oauth-protected-resource"'
            ],
            passCriteria: [
                'Server returns HTTP 401 status on unauthorized requests',
                'Response includes WWW-Authenticate header',
                'Header contains "Bearer" authentication scheme (case-insensitive)',
                'Header is properly formatted according to RFC 6750 Section 3'
            ]
        },
        'RFC 9728 (OAuth 2.1 Protected Resource Metadata) - /.well-known endpoint': {
            title: 'OAuth Metadata Endpoint (RFC 9728)',
            description: 'Servers should provide a standardized metadata endpoint at /.well-known/oauth-protected-resource that describes the OAuth configuration, including authorization servers and supported features.',
            implementation: [
                'Create endpoint at: /.well-known/oauth-protected-resource',
                'Respond with JSON content-type: application/json',
                'Return HTTP 200 status code',
                'Include required field: "authorization_servers" - array of authorization server URLs',
                'Optionally include: "resource" (resource identifier), "scopes_supported", "bearer_methods_supported"',
                'Example response: { "authorization_servers": ["https://auth.example.com"], "resource": "https://api.example.com", "scopes_supported": ["mcp:read", "mcp:write"] }'
            ],
            passCriteria: [
                'Endpoint /.well-known/oauth-protected-resource returns HTTP 200',
                'Response is valid JSON',
                'JSON contains "authorization_servers" or "authorization_server" field',
                'Authorization servers field is non-empty (array or string)'
            ]
        },
        'RFC 6750 (OAuth 2.0 Bearer Token Usage) - Error codes': {
            title: 'OAuth Error Codes (RFC 6750)',
            description: 'When rejecting a request due to authentication issues, servers should return standardized OAuth error codes that help clients understand what went wrong and how to fix it.',
            implementation: [
                'Include error codes in WWW-Authenticate header or JSON response body',
                'Use standardized error codes: "invalid_token" (token expired, malformed, invalid), "insufficient_scope" (requires more permissions), "invalid_request" (malformed request)',
                'WWW-Authenticate example: WWW-Authenticate: Bearer error="invalid_token", error_description="Token has expired"',
                'JSON body example: { "error": "invalid_token", "error_description": "Token has expired", "error_uri": "https://docs.example.com/errors/invalid_token" }',
                'Optionally include error_description (human-readable) and error_uri (link to documentation)'
            ],
            passCriteria: [
                'Response contains OAuth 2.0 error code in body or WWW-Authenticate header',
                'Error code is one of: invalid_token, insufficient_scope, or invalid_request',
                'Error code appears in either response body JSON or WWW-Authenticate header parameters'
            ]
        }
    };

    // Load results on mount
    useEffect(() => {
        loadResults();
    }, []);

    // Fetch favicons for all servers when results load
    useEffect(() => {
        if (!results) return;

        console.log('[OAuthCompliance] Loading favicons for', results.results.length, 'servers');
        console.log('[OAuthCompliance] Current favicon cache size:', Object.keys(faviconCache).length);

        results.results.forEach((result) => {
            const cacheKey = result.url;
            const cachedValue = faviconCache[cacheKey];
            
            // Skip if already cached AND not null (null means previous fetch failed)
            if (cachedValue !== undefined && cachedValue !== null) {
                return;
            }

            // If we have iconUrl from CSV, use it directly (even if cache has null)
            if (result.iconUrl) {
                console.log('[OAuthCompliance] Setting favicon from CSV for', result.serverName, ':', result.iconUrl);
                setFaviconUrl(result.url, result.iconUrl);
                return;
            }

            // Otherwise, fetch favicon from backend as fallback
            console.log('[OAuthCompliance] Fetching favicon from backend for', result.serverName);
            backendClient.getFaviconUrl(result.url).then((url) => {
                setFaviconUrl(result.url, url);
            }).catch((error) => {
                console.warn(`Failed to fetch favicon for ${result.serverName}:`, error);
                setFaviconUrl(result.url, null);
            });
        });
    }, [results, faviconCache, setFaviconUrl]);

    const loadResults = async () => {
        setLoading(true);
        setError(null);
        try {
            // Try loading from different possible locations
            const paths = [
                '/tests/oauth-compliance-results.json',
                '../tests/oauth-compliance-results.json',
                './tests/oauth-compliance-results.json'
            ];

            let data = null;

            for (const path of paths) {
                try {
                    const response = await fetch(path);
                    if (response.ok) {
                        data = await response.json();
                        break;
                    }
                } catch {
                    // Try next path
                }
            }

            if (!data) {
                throw new Error('Results file not found. Run "npm run test:oauth-compliance" first.');
            }

            setResults(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load results');
        } finally {
            setLoading(false);
        }
    };

    const filteredAndSortedResults = useMemo(() => {
        if (!results) return [];

        let filtered = results.results;

        // Apply filter
        if (filterStatus !== 'all') {
            filtered = filtered.filter(r => r.status === filterStatus);
        }

        // Apply sort
        const sorted = [...filtered].sort((a, b) => {
            let compareValue = 0;

            if (sortBy === 'name') {
                compareValue = a.serverName.localeCompare(b.serverName);
            } else if (sortBy === 'score') {
                compareValue = a.score - b.score;
            } else if (sortBy === 'status') {
                compareValue = a.status.localeCompare(b.status);
            }

            return sortOrder === 'asc' ? compareValue : -compareValue;
        });

        return sorted;
    }, [results, sortBy, sortOrder, filterStatus]);

    const getStatusBadge = (status: string) => {
        const badges: Record<string, { label: string; className: string; icon: any }> = {
            oauth: { label: 'OAuth', className: 'status-badge status-oauth', icon: Shield },
            header_auth: { label: 'Header Auth', className: 'status-badge status-header-auth', icon: Key },
            no_auth: { label: 'Public Access', className: 'status-badge status-no-auth', icon: Globe },
            error: { label: 'Error', className: 'status-badge status-error', icon: XCircle },
            unknown: { label: 'Unknown', className: 'status-badge status-unknown', icon: AlertCircle },
        };

        const badge = badges[status] || badges.unknown;
        const Icon = badge.icon;
        return (
            <span className={badge.className}>
                <Icon size={14} />
                {badge.label}
            </span>
        );
    };

    const getScoreColor = (score: number) => {
        if (score >= 75) return 'var(--color-success)';
        if (score >= 50) return 'var(--color-warning)';
        if (score >= 25) return 'var(--color-error-light)';
        return 'var(--color-error)';
    };

    if (!results && !loading && !error) {
        return (
            <div className="oauth-compliance-container">
                <div className="oauth-compliance-header">
                    <div className="header-content">
                        <div className="header-icon">
                            <Shield size={32} />
                        </div>
                        <div className="header-text">
                            <h1>OAuth Compliance Results</h1>
                            <p>Testing MCP servers against OAuth 2.1 and RFC specifications</p>
                        </div>
                    </div>
                    <button className="refresh-button" onClick={loadResults}>
                        <RefreshCw size={16} />
                        Refresh
                    </button>
                </div>

                <div className="oauth-compliance-empty">
                    <div className="empty-state">
                        <div className="empty-icon">
                            <FileCheck size={64} strokeWidth={1.5} />
                        </div>
                        <h2>No Results Yet</h2>
                        <p>Run the OAuth compliance test to see results</p>
                        <code className="command">npm run test:oauth-compliance</code>
                        <button className="load-button" onClick={loadResults}>
                            <Zap size={16} />
                            Load Results
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="oauth-compliance-container">
                <div className="oauth-compliance-loading">
                    <div className="spinner"></div>
                    <p>Loading results...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="oauth-compliance-container">
                <div className="oauth-compliance-error">
                    <h2>❌ Error Loading Results</h2>
                    <p>{error}</p>
                    <button className="retry-button" onClick={loadResults}>
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    if (!results) return null;

    return (
        <div className="oauth-compliance-container">
            <div className="oauth-compliance-header">
                <h1>🔐 OAuth Compliance Results</h1>
                <p>{results.metadata.description}</p>
                <button className="refresh-button" onClick={loadResults}>
                    🔄 Refresh
                </button>
            </div>

            {/* Summary Stats */}
            <div className="summary-grid">
                <div className="summary-card">
                    <div className="summary-icon">
                        <Server size={24} />
                    </div>
                    <div className="summary-content">
                        <div className="summary-number">{results.summary.testedServers}</div>
                        <div className="summary-label">Servers Tested</div>
                        <div className="summary-subtitle">of {results.summary.totalServers}</div>
                    </div>
                </div>

                <div className="summary-card summary-card-success">
                    <div className="summary-icon">
                        <Shield size={24} />
                    </div>
                    <div className="summary-content">
                        <div className="summary-number">{results.summary.oauthCompliant}</div>
                        <div className="summary-label">OAuth Compliant</div>
                        <div className="summary-subtitle">
                            {Math.round((results.summary.oauthCompliant / results.summary.testedServers) * 100)}%
                        </div>
                    </div>
                </div>

                <div className="summary-card summary-card-warning">
                    <div className="summary-icon">
                        <Key size={24} />
                    </div>
                    <div className="summary-content">
                        <div className="summary-number">{results.summary.headerAuth}</div>
                        <div className="summary-label">Header Auth</div>
                        <div className="summary-subtitle">
                            {Math.round((results.summary.headerAuth / results.summary.testedServers) * 100)}%
                        </div>
                    </div>
                </div>

                <div className="summary-card summary-card-success">
                    <div className="summary-icon">
                        <Globe size={24} />
                    </div>
                    <div className="summary-content">
                        <div className="summary-number">{results.summary.noAuth}</div>
                        <div className="summary-label">Public Access</div>
                        <div className="summary-subtitle">
                            {Math.round((results.summary.noAuth / results.summary.testedServers) * 100)}%
                        </div>
                    </div>
                </div>
            </div>

            {/* Specs Being Tested */}
            <div className="specs-section">
                <h3><Award size={20} /> Testing Against</h3>
                <ul className="specs-list">
                    {results.metadata.specs.map((spec, i) => (
                        <li
                            key={i}
                            onClick={() => setSelectedSpec(spec)}
                            className="spec-item-clickable"
                            title="Click for implementation details"
                        >
                            <CheckCircle2 size={16} />
                            {spec}
                            <Info size={14} className="spec-info-icon" />
                        </li>
                    ))}
                </ul>
            </div>

            {/* Filters and Sort Controls */}
            <div className="controls-bar">
                <div className="filter-group">
                    <Filter size={16} />
                    <label>Filter:</label>
                    <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                        <option value="all">All ({results.results.length})</option>
                        <option value="oauth">OAuth ({results.summary.oauthCompliant})</option>
                        <option value="header_auth">Header Auth ({results.summary.headerAuth})</option>
                        <option value="no_auth">Public Access ({results.summary.noAuth})</option>
                        <option value="error">Error ({results.summary.errors})</option>
                    </select>
                </div>

                <div className="sort-group">
                    <ArrowUpDown size={16} />
                    <label>Sort:</label>
                    <select value={sortBy} onChange={e => setSortBy(e.target.value as any)}>
                        <option value="score">Compliance Score</option>
                        <option value="name">Server Name</option>
                        <option value="status">Status</option>
                    </select>
                    <button
                        className="sort-order-button"
                        onClick={() => setSortOrder(order => order === 'asc' ? 'desc' : 'asc')}
                        title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}
                    >
                        {sortOrder === 'asc' ? '↑' : '↓'}
                    </button>
                </div>
            </div>

            {/* Results Table */}
            <div className="results-table">
                <div className="results-header">
                    <div className="col-name">Server</div>
                    <div className="col-score">Compliance Score</div>
                    <div className="col-status">Status</div>
                    <div className="col-checks">Checks</div>
                    <div className="col-actions"></div>
                </div>

                {filteredAndSortedResults.map((result) => {
                    const cachedFavicon = faviconCache[result.url];
                    
                    // Debug logging
                    if (!cachedFavicon && result.iconUrl) {
                        console.log('[OAuthCompliance] Missing favicon in cache for', result.serverName, {
                            url: result.url,
                            iconUrl: result.iconUrl,
                            inCache: result.url in faviconCache,
                            cacheValue: faviconCache[result.url]
                        });
                    }

                    return (
                        <div key={result.url} className="result-row">
                            <div className="result-main">
                                <div className="col-name">
                                    <div className="server-name-with-icon">
                                        {cachedFavicon ? (
                                            <img
                                                src={cachedFavicon}
                                                alt={`${result.serverName} favicon`}
                                                className="server-favicon"
                                                onError={(e) => {
                                                    // Hide broken images
                                                    e.currentTarget.style.display = 'none';
                                                }}
                                            />
                                        ) : (
                                            <div className="server-favicon-placeholder">
                                                <Server size={16} />
                                            </div>
                                        )}
                                        <div className="server-info">
                                            <div className="server-name">{result.serverName}</div>
                                            <div className="server-url">{result.url}</div>
                                        </div>
                                    </div>
                                </div>

                                <div className="col-score">
                                    {result.status === 'no_auth' ? (
                                        <div className="score-na">
                                            <span className="na-badge">N/A</span>
                                            <span className="na-text">No OAuth Required</span>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="score-bar-container">
                                                <div
                                                    className="score-bar-fill"
                                                    style={{
                                                        width: `${result.score}%`,
                                                        backgroundColor: getScoreColor(result.score)
                                                    }}
                                                />
                                            </div>
                                            <div className="score-text" style={{ color: getScoreColor(result.score) }}>
                                                {result.score}%
                                            </div>
                                        </>
                                    )}
                                </div>

                                <div className="col-status">
                                    {getStatusBadge(result.status)}
                                </div>

                                <div className="col-checks">
                                    <div className="checks-grid">
                                        <span
                                            className={result.compliance.wwwAuthenticateHeader ? 'check-pass' : 'check-fail'}
                                            title="WWW-Authenticate Header: Server returns RFC 6750 compliant WWW-Authenticate header with 'Bearer' realm on 401 responses"
                                        >
                                            {result.compliance.wwwAuthenticateHeader ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                                            Header
                                        </span>
                                        <span
                                            className={result.compliance.rfc9728Metadata ? 'check-pass' : 'check-fail'}
                                            title="RFC 9728 Metadata: Server provides OAuth metadata at /.well-known/oauth-protected-resource endpoint"
                                        >
                                            {result.compliance.rfc9728Metadata ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                                            RFC 9728
                                        </span>
                                        <span
                                            className={result.compliance.oauthErrorCodes ? 'check-pass' : 'check-fail'}
                                            title="OAuth Error Codes: Server returns RFC 6750 compliant error codes (invalid_token, insufficient_scope, etc.)"
                                        >
                                            {result.compliance.oauthErrorCodes ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                                            Errors
                                        </span>
                                        <span
                                            className={result.compliance.mcpSdkUnauthorizedError ? 'check-pass check-sdk' : 'check-fail check-sdk'}
                                            title="MCP SDK Integration (Informational): MCP SDK properly detects OAuth requirement and throws UnauthorizedError. This is a client SDK feature, not a server requirement."
                                        >
                                            {result.compliance.mcpSdkUnauthorizedError ? <CheckCircle2 size={14} /> : <Info size={14} />}
                                            SDK
                                        </span>
                                    </div>
                                </div>

                                <div className="col-actions">
                                    <button
                                        className="expand-button"
                                        onClick={() => setExpandedServer(
                                            expandedServer === result.url ? null : result.url
                                        )}
                                        title={expandedServer === result.url ? 'Collapse' : 'Expand details'}
                                    >
                                        {expandedServer === result.url ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                    </button>
                                </div>
                            </div>

                            {expandedServer === result.url && (
                                <div className="result-details">
                                    <h4><Info size={18} /> Detailed Information</h4>

                                    <div className="details-grid">
                                        {result.details.httpStatus && (
                                            <div className="detail-item">
                                                <span className="detail-label">HTTP Status:</span>
                                                <span className="detail-value">{result.details.httpStatus}</span>
                                            </div>
                                        )}

                                        {result.details.wwwAuthenticate && (
                                            <div className="detail-item">
                                                <span className="detail-label">WWW-Authenticate:</span>
                                                <span className="detail-value detail-code">{result.details.wwwAuthenticate}</span>
                                            </div>
                                        )}

                                        {result.details.resourceMetadataUrl && (
                                            <div className="detail-item">
                                                <span className="detail-label">Resource Metadata URL:</span>
                                                <a
                                                    href={result.details.resourceMetadataUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="detail-value detail-link"
                                                >
                                                    <ExternalLink size={14} />
                                                    {result.details.resourceMetadataUrl}
                                                </a>
                                            </div>
                                        )}

                                        {result.details.oauthErrorCode && (
                                            <div className="detail-item">
                                                <span className="detail-label">OAuth Error Code:</span>
                                                <span className="detail-value detail-highlight">{result.details.oauthErrorCode}</span>
                                            </div>
                                        )}

                                        {result.details.authorizationServers && (
                                            <div className="detail-item">
                                                <span className="detail-label">Authorization Servers:</span>
                                                <div className="detail-value">
                                                    {result.details.authorizationServers.map((server: string, idx: number) => (
                                                        <div key={idx}>
                                                            <a
                                                                href={server}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="detail-link"
                                                            >
                                                                <ExternalLink size={14} />
                                                                {server}
                                                            </a>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {result.details.resource && (
                                            <div className="detail-item">
                                                <span className="detail-label">Resource:</span>
                                                <a
                                                    href={result.details.resource}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="detail-value detail-link"
                                                >
                                                    <ExternalLink size={14} />
                                                    {result.details.resource}
                                                </a>
                                            </div>
                                        )}

                                        {result.details.scopesSupported && (
                                            <div className="detail-item">
                                                <span className="detail-label">Scopes Supported:</span>
                                                <span className="detail-value">
                                                    {result.details.scopesSupported.join(', ')}
                                                </span>
                                            </div>
                                        )}

                                        {result.details.bearerMethodsSupported && (
                                            <div className="detail-item">
                                                <span className="detail-label">Bearer Methods:</span>
                                                <span className="detail-value">
                                                    {result.details.bearerMethodsSupported.join(', ')}
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {result.details.responseBody && (
                                        <div className="detail-item detail-full">
                                            <span className="detail-label">Response Body:</span>
                                            <pre className="detail-json">
                                                {JSON.stringify(result.details.responseBody, null, 2)}
                                            </pre>
                                        </div>
                                    )}

                                    {result.error && (
                                        <div className="detail-item detail-full">
                                            <span className="detail-label error-label">Error:</span>
                                            <span className="detail-value error-message">{result.error}</span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {filteredAndSortedResults.length === 0 && (
                <div className="no-results">
                    <p>No servers match the current filter.</p>
                </div>
            )}

            {/* Footer */}
            <div className="results-footer">
                <p>
                    Test run: {new Date(results.metadata.startTime).toLocaleString()}
                    {results.metadata.endTime && ` - ${new Date(results.metadata.endTime).toLocaleString()}`}
                </p>
                <p className="footer-note">
                    To run the test again: <code>npm run test:oauth-compliance</code>
                </p>
            </div>

            {/* Spec Details Modal */}
            {selectedSpec && specDetails[selectedSpec] && (
                <div className="spec-modal-overlay" onClick={() => setSelectedSpec(null)}>
                    <div className="spec-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="spec-modal-header">
                            <h2><FileCheck size={24} /> {specDetails[selectedSpec].title}</h2>
                            <button
                                className="spec-modal-close"
                                onClick={() => setSelectedSpec(null)}
                                title="Close"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="spec-modal-content">
                            <div className="spec-modal-section">
                                <h3><Info size={20} /> Overview</h3>
                                <p>{specDetails[selectedSpec].description}</p>
                            </div>

                            <div className="spec-modal-section">
                                <h3><Zap size={20} /> How to Implement</h3>
                                <ol className="spec-modal-list">
                                    {specDetails[selectedSpec].implementation.map((item, idx) => (
                                        <li key={idx}>{item}</li>
                                    ))}
                                </ol>
                            </div>

                            <div className="spec-modal-section">
                                <h3><CheckCircle2 size={20} /> Pass Criteria (Our Test)</h3>
                                <p className="spec-modal-note">We mark this check as <strong>PASSED</strong> when:</p>
                                <ul className="spec-modal-list spec-modal-criteria">
                                    {specDetails[selectedSpec].passCriteria.map((item, idx) => (
                                        <li key={idx}>
                                            <CheckCircle2 size={16} className="criteria-icon" />
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <div className="spec-modal-footer">
                                <p><strong>Note:</strong> Servers must pass at least one of the three checks to be considered OAuth-compliant. Passing all three checks indicates full RFC compliance.</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
});

