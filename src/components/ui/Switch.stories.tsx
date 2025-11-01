import type { Meta, StoryObj } from '@storybook/react';
import { Switch } from './Switch';
import { useState } from 'react';

const meta: Meta<typeof Switch> = {
    title: 'UI/Switch',
    component: Switch,
    parameters: {
        layout: 'padded',
    },
    tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Switch>;

export const Default: Story = {
    args: {
        label: 'Enable notifications',
    },
};

export const WithHelperText: Story = {
    args: {
        label: 'Auto-reconnect',
        helperText: 'Automatically reconnect when connection is lost',
    },
};

export const Checked: Story = {
    args: {
        label: 'Enable dark mode',
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
        label: 'Always enabled',
        checked: true,
        disabled: true,
    },
};

export const Controlled: Story = {
    render: () => {
        const [enabled, setEnabled] = useState(false);
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <Switch
                    label="Enable auto-save"
                    checked={enabled}
                    onChange={(e) => setEnabled(e.target.checked)}
                    helperText="Automatically save changes as you type"
                />
                <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                    Auto-save: {enabled ? 'On' : 'Off'}
                </p>
            </div>
        );
    },
};

export const SettingsPanel: Story = {
    render: () => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '400px' }}>
            <h4 style={{ margin: 0, color: 'var(--text-primary)' }}>Server Settings</h4>
            <Switch label="Enable auto-reconnect" defaultChecked helperText="Reconnect automatically on disconnect" />
            <Switch label="Show notifications" defaultChecked helperText="Display desktop notifications" />
            <Switch label="Debug mode" helperText="Enable detailed logging" />
            <Switch label="Experimental features" helperText="Try out beta features (may be unstable)" />
        </div>
    ),
};

