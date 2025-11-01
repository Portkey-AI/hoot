import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { ToggleGroup } from './ToggleGroup';

const meta = {
    title: 'UI/ToggleGroup',
    component: ToggleGroup,
    parameters: {
        layout: 'centered',
    },
    tags: ['autodocs'],
} satisfies Meta<typeof ToggleGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

const transportOptions = [
    { value: 'stdio', label: 'stdio' },
    { value: 'sse', label: 'SSE' },
];

const authOptions = [
    { value: 'none', label: 'None' },
    { value: 'header', label: 'Header' },
    { value: 'oauth', label: 'OAuth Auto' },
    { value: 'oauth_client_credentials', label: 'OAuth Client' },
];

export const Transport: Story = {
    render: () => {
        const [value, setValue] = useState('stdio');
        return (
            <div style={{ width: '300px' }}>
                <ToggleGroup
                    label="Transport"
                    options={transportOptions}
                    value={value}
                    onChange={setValue}
                />
            </div>
        );
    },
};

export const Authentication: Story = {
    render: () => {
        const [value, setValue] = useState('none');
        return (
            <div style={{ width: '500px' }}>
                <ToggleGroup
                    label="Authentication"
                    options={authOptions}
                    value={value}
                    onChange={setValue}
                />
            </div>
        );
    },
};

export const WithHelperText: Story = {
    render: () => {
        const [value, setValue] = useState('stdio');
        return (
            <div style={{ width: '300px' }}>
                <ToggleGroup
                    label="Transport"
                    options={transportOptions}
                    value={value}
                    onChange={setValue}
                    helperText="Choose how the server communicates"
                />
            </div>
        );
    },
};

export const WithError: Story = {
    render: () => {
        const [value, setValue] = useState('');
        return (
            <div style={{ width: '300px' }}>
                <ToggleGroup
                    label="Transport"
                    options={transportOptions}
                    value={value}
                    onChange={setValue}
                    error="Please select a transport method"
                />
            </div>
        );
    },
};

export const Disabled: Story = {
    render: () => {
        const [value, setValue] = useState('stdio');
        return (
            <div style={{ width: '300px' }}>
                <ToggleGroup
                    label="Transport"
                    options={transportOptions}
                    value={value}
                    onChange={setValue}
                    disabled
                />
            </div>
        );
    },
};

export const WithDisabledOption: Story = {
    render: () => {
        const [value, setValue] = useState('stdio');
        return (
            <div style={{ width: '300px' }}>
                <ToggleGroup
                    label="Transport"
                    options={[
                        { value: 'stdio', label: 'stdio' },
                        { value: 'sse', label: 'SSE', disabled: true },
                    ]}
                    value={value}
                    onChange={setValue}
                />
            </div>
        );
    },
};

