import type { Meta, StoryObj } from '@storybook/react';
import { RadioGroup } from './Radio';
import { useState } from 'react';

const meta: Meta<typeof RadioGroup> = {
    title: 'UI/RadioGroup',
    component: RadioGroup,
    parameters: {
        layout: 'padded',
    },
    tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof RadioGroup>;

const transportOptions = [
    { value: 'http', label: 'HTTP' },
    { value: 'sse', label: 'Server-Sent Events (SSE)' },
    { value: 'stdio', label: 'Standard I/O (STDIO)' },
];

export const Default: Story = {
    args: {
        name: 'transport',
        options: transportOptions,
    },
};

export const WithLabel: Story = {
    args: {
        name: 'transport-labeled',
        label: 'Select Transport Type',
        options: transportOptions,
    },
};

export const WithHelperText: Story = {
    args: {
        name: 'transport-helper',
        label: 'Select Transport Type',
        options: transportOptions,
        helperText: 'Choose how the client will communicate with the server',
    },
};

export const WithError: Story = {
    args: {
        name: 'transport-error',
        label: 'Select Transport Type',
        options: transportOptions,
        error: 'Please select a transport type',
    },
};

export const WithDefaultValue: Story = {
    args: {
        name: 'transport-default',
        label: 'Select Transport Type',
        options: transportOptions,
        value: 'http',
    },
};

export const Disabled: Story = {
    args: {
        name: 'transport-disabled',
        label: 'Select Transport Type',
        options: transportOptions,
        disabled: true,
        value: 'http',
    },
};

export const WithDisabledOption: Story = {
    args: {
        name: 'plan',
        label: 'Select Plan',
        options: [
            { value: 'free', label: 'Free Plan' },
            { value: 'pro', label: 'Pro Plan' },
            { value: 'enterprise', label: 'Enterprise Plan', disabled: true },
        ],
    },
};

export const Controlled: Story = {
    render: () => {
        const [value, setValue] = useState('http');
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <RadioGroup
                    name="transport-controlled"
                    label="Select Transport Type"
                    options={transportOptions}
                    value={value}
                    onChange={setValue}
                />
                <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                    Selected: {value}
                </p>
            </div>
        );
    },
};

export const AuthMethod: Story = {
    args: {
        name: 'auth',
        label: 'Authentication Method',
        options: [
            { value: 'none', label: 'No Authentication' },
            { value: 'headers', label: 'Custom Headers' },
            { value: 'oauth', label: 'OAuth 2.0' },
        ],
        value: 'none',
    },
};

export const Horizontal: Story = {
    args: {
        name: 'transport-horizontal',
        label: 'Transport Type',
        orientation: 'horizontal',
        options: transportOptions,
    },
};

export const HorizontalCompact: Story = {
    args: {
        name: 'auth-horizontal',
        label: 'Authentication',
        orientation: 'horizontal',
        options: [
            { value: 'none', label: 'None' },
            { value: 'headers', label: 'Headers' },
            { value: 'oauth', label: 'OAuth Auto' },
            { value: 'oauth_client', label: 'OAuth Client' },
        ],
        value: 'none',
    },
};

