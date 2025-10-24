/**
 * Test file to demonstrate and verify tool state management functionality
 * 
 * This file can be used to manually test the tool state features in the browser console.
 */

// Import the tool state store
import { useToolStateStore } from '../src/stores/toolStateStore';

// Test data
const TEST_SERVER_ID = 'test-server-123';
const TEST_TOOL_NAME = 'test-tool';
const TEST_PARAMETERS = {
    query: 'hello world',
    limit: 10,
    enabled: true
};

/**
 * Test 1: Save and retrieve tool parameters
 */
export function testSaveAndRetrieveParameters() {
    console.log('=== Test 1: Save and Retrieve Parameters ===');

    const store = useToolStateStore.getState();

    // Save parameters
    store.saveToolParameters(TEST_SERVER_ID, TEST_TOOL_NAME, TEST_PARAMETERS);
    console.log('✓ Saved parameters:', TEST_PARAMETERS);

    // Retrieve parameters
    const retrieved = store.getToolParameters(TEST_SERVER_ID, TEST_TOOL_NAME);
    console.log('✓ Retrieved parameters:', retrieved);

    // Verify
    const match = JSON.stringify(retrieved) === JSON.stringify(TEST_PARAMETERS);
    console.log(match ? '✓ Test PASSED' : '✗ Test FAILED');

    return match;
}

/**
 * Test 2: Record tool execution
 */
export function testRecordExecution() {
    console.log('\n=== Test 2: Record Tool Execution ===');

    const store = useToolStateStore.getState();

    // Record first execution
    store.recordToolExecution(TEST_SERVER_ID, TEST_TOOL_NAME);
    console.log('✓ Recorded first execution');

    // Get state
    let state = store.getToolState(TEST_SERVER_ID, TEST_TOOL_NAME);
    console.log('✓ Tool state after 1st execution:', state);

    // Record second execution
    store.recordToolExecution(TEST_SERVER_ID, TEST_TOOL_NAME);
    console.log('✓ Recorded second execution');

    // Get state again
    state = store.getToolState(TEST_SERVER_ID, TEST_TOOL_NAME);
    console.log('✓ Tool state after 2nd execution:', state);

    // Verify
    const success = state?.executionCount === 2;
    console.log(success ? '✓ Test PASSED' : '✗ Test FAILED');

    return success;
}

/**
 * Test 3: Server data isolation
 */
export function testServerIsolation() {
    console.log('\n=== Test 3: Server Data Isolation ===');

    const store = useToolStateStore.getState();
    const SERVER_1 = 'server-1';
    const SERVER_2 = 'server-2';
    const PARAMS_1 = { value: 'server-1-params' };
    const PARAMS_2 = { value: 'server-2-params' };

    // Save different params for same tool on different servers
    store.saveToolParameters(SERVER_1, TEST_TOOL_NAME, PARAMS_1);
    store.saveToolParameters(SERVER_2, TEST_TOOL_NAME, PARAMS_2);
    console.log('✓ Saved parameters for 2 different servers');

    // Retrieve and verify
    const retrieved1 = store.getToolParameters(SERVER_1, TEST_TOOL_NAME);
    const retrieved2 = store.getToolParameters(SERVER_2, TEST_TOOL_NAME);

    console.log('✓ Server 1 params:', retrieved1);
    console.log('✓ Server 2 params:', retrieved2);

    // Verify isolation
    const success =
        JSON.stringify(retrieved1) === JSON.stringify(PARAMS_1) &&
        JSON.stringify(retrieved2) === JSON.stringify(PARAMS_2);

    console.log(success ? '✓ Test PASSED' : '✗ Test FAILED');

    return success;
}

/**
 * Test 4: Clear server data
 */
export function testClearServerData() {
    console.log('\n=== Test 4: Clear Server Data ===');

    const store = useToolStateStore.getState();

    // Setup data
    store.saveToolParameters(TEST_SERVER_ID, TEST_TOOL_NAME, TEST_PARAMETERS);
    store.recordToolExecution(TEST_SERVER_ID, TEST_TOOL_NAME);
    console.log('✓ Setup test data');

    // Verify data exists
    let params = store.getToolParameters(TEST_SERVER_ID, TEST_TOOL_NAME);
    let state = store.getToolState(TEST_SERVER_ID, TEST_TOOL_NAME);
    console.log('✓ Data exists before clear:', { params, state });

    // Clear server data
    store.clearServerData(TEST_SERVER_ID);
    console.log('✓ Cleared server data');

    // Verify data is gone
    params = store.getToolParameters(TEST_SERVER_ID, TEST_TOOL_NAME);
    state = store.getToolState(TEST_SERVER_ID, TEST_TOOL_NAME);
    console.log('✓ Data after clear:', { params, state });

    // Verify
    const success = params === undefined && state === undefined;
    console.log(success ? '✓ Test PASSED' : '✗ Test FAILED');

    return success;
}

/**
 * Test 5: LocalStorage persistence
 */
export function testLocalStoragePersistence() {
    console.log('\n=== Test 5: LocalStorage Persistence ===');

    const store = useToolStateStore.getState();
    const testData = { test: 'persistence-test' };

    // Save data
    store.saveToolParameters(TEST_SERVER_ID, 'persistence-test-tool', testData);
    console.log('✓ Saved data to store');

    // Check localStorage
    const stored = localStorage.getItem('hoot-tool-state');
    console.log('✓ localStorage content exists:', stored !== null);

    if (stored) {
        const parsed = JSON.parse(stored);
        console.log('✓ Parsed localStorage data structure:', Object.keys(parsed));

        // Verify our data is in there
        const hasServerData = parsed.state?.serverData?.[TEST_SERVER_ID]?.toolParameters?.['persistence-test-tool'];
        console.log('✓ Test data found in localStorage:', !!hasServerData);

        return !!hasServerData;
    }

    return false;
}

/**
 * Run all tests
 */
export function runAllTests() {
    console.log('🧪 Running Tool State Management Tests\n');

    const results = {
        saveAndRetrieve: testSaveAndRetrieveParameters(),
        recordExecution: testRecordExecution(),
        serverIsolation: testServerIsolation(),
        clearServerData: testClearServerData(),
        localStoragePersistence: testLocalStoragePersistence()
    };

    console.log('\n📊 Test Results Summary:');
    Object.entries(results).forEach(([test, passed]) => {
        console.log(`${passed ? '✓' : '✗'} ${test}: ${passed ? 'PASSED' : 'FAILED'}`);
    });

    const allPassed = Object.values(results).every(r => r);
    console.log(`\n${allPassed ? '✓ All tests PASSED!' : '✗ Some tests FAILED'}`);

    return results;
}

// For manual testing in browser console:
// import { runAllTests } from './test-tool-state.js'
// runAllTests()

