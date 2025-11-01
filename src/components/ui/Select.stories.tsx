import type { Meta, StoryObj } from '@storybook/react';
import { Select } from './Select';
import { useState } from 'react';

const meta: Meta<typeof Select> = {
    title: 'UI/Select',
    component: Select,
    parameters: {
        layout: 'padded',
    },
    tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Select>;

const transportOptions = [
    { value: 'http', label: 'HTTP' },
    { value: 'sse', label: 'Server-Sent Events (SSE)' },
    { value: 'stdio', label: 'Standard I/O (STDIO)' },
];

export const Default: Story = {
    args: {
        options: transportOptions,
        placeholder: 'Select transport...',
    },
};

export const WithLabel: Story = {
    args: {
        label: 'Transport Type',
        options: transportOptions,
        placeholder: 'Select transport...',
    },
};

export const Required: Story = {
    args: {
        label: 'Auth Method',
        required: true,
        options: [
            { value: 'none', label: 'None' },
            { value: 'headers', label: 'Headers' },
            { value: 'oauth', label: 'OAuth 2.0' },
        ],
        placeholder: 'Select method...',
    },
};

export const WithHelperText: Story = {
    args: {
        label: 'Server Type',
        options: [
            { value: 'production', label: 'Production' },
            { value: 'staging', label: 'Staging' },
            { value: 'development', label: 'Development' },
        ],
        helperText: 'Choose the environment for this server',
    },
};

export const WithError: Story = {
    args: {
        label: 'Region',
        options: [
            { value: 'us-east', label: 'US East' },
            { value: 'us-west', label: 'US West' },
            { value: 'eu', label: 'Europe' },
        ],
        error: 'This region is currently unavailable',
    },
};

export const Disabled: Story = {
    args: {
        label: 'Status',
        options: [
            { value: 'active', label: 'Active' },
            { value: 'inactive', label: 'Inactive' },
        ],
        disabled: true,
        value: 'active',
    },
};

export const WithDisabledOption: Story = {
    args: {
        label: 'Plan',
        options: [
            { value: 'free', label: 'Free' },
            { value: 'pro', label: 'Pro' },
            { value: 'enterprise', label: 'Enterprise', disabled: true },
        ],
    },
};

export const Controlled: Story = {
    render: () => {
        const [value, setValue] = useState('');
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <Select
                    label="Transport Type"
                    options={transportOptions}
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    placeholder="Select transport..."
                />
                <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                    Selected: {value || '(none)'}
                </p>
            </div>
        );
    },
};

