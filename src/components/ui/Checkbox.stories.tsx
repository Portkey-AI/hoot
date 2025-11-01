import type { Meta, StoryObj } from '@storybook/react';
import { Checkbox } from './Checkbox';
import { useState } from 'react';

const meta: Meta<typeof Checkbox> = {
    title: 'UI/Checkbox',
    component: Checkbox,
    parameters: {
        layout: 'padded',
    },
    tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Checkbox>;

export const Default: Story = {
    args: {
        label: 'Accept terms and conditions',
    },
};

export const WithHelperText: Story = {
    args: {
        label: 'Enable notifications',
        helperText: 'Receive email notifications for important updates',
    },
};

export const Checked: Story = {
    args: {
        label: 'Subscribe to newsletter',
        defaultChecked: true,
    },
};

export const Disabled: Story = {
    args: {
        label: 'This option is disabled',
        disabled: true,
    },
};

export const CheckedDisabled: Story = {
    args: {
        label: 'Permanently enabled',
        checked: true,
        disabled: true,
    },
};

export const Controlled: Story = {
    render: () => {
        const [checked, setChecked] = useState(false);
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <Checkbox
                    label="Enable auto-reconnect"
                    checked={checked}
                    onChange={(e) => setChecked(e.target.checked)}
                    helperText="Automatically reconnect when connection is lost"
                />
                <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                    Status: {checked ? 'Enabled' : 'Disabled'}
                </p>
            </div>
        );
    },
};

export const MultipleCheckboxes: Story = {
    render: () => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h4 style={{ margin: 0, color: 'var(--text-primary)' }}>Select tools to enable:</h4>
            <Checkbox label="Web Search" defaultChecked />
            <Checkbox label="Image Generation" />
            <Checkbox label="Code Execution" defaultChecked />
            <Checkbox label="File Operations" />
        </div>
    ),
};

