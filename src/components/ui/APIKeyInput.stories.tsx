import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { APIKeyInput } from './APIKeyInput';

const meta: Meta<typeof APIKeyInput> = {
    title: 'UI/APIKeyInput',
    component: APIKeyInput,
    parameters: {
        layout: 'centered',
    },
    tags: ['autodocs'],
    argTypes: {
        showToggle: {
            control: 'boolean',
            description: 'Show/hide toggle button',
        },
    },
};

export default meta;
type Story = StoryObj<typeof APIKeyInput>;

export const Default: Story = {
    args: {
        label: 'API Key',
        placeholder: 'sk-...',
    },
};

export const WithValue: Story = {
    args: {
        label: 'API Key',
        value: 'sk-1234567890abcdef',
        placeholder: 'sk-...',
    },
};

export const Required: Story = {
    args: {
        label: 'API Key',
        placeholder: 'sk-...',
        required: true,
    },
};

export const WithHelperText: Story = {
    args: {
        label: 'Portkey API Key',
        placeholder: 'sk-...',
        helperText: 'Get your API key at portkey.ai',
    },
};

export const WithError: Story = {
    args: {
        label: 'API Key',
        placeholder: 'sk-...',
        error: 'Invalid API key format',
        value: 'invalid-key',
    },
};

export const Disabled: Story = {
    args: {
        label: 'API Key',
        placeholder: 'sk-...',
        value: 'sk-1234567890abcdef',
        disabled: true,
    },
};

export const NoToggle: Story = {
    args: {
        label: 'API Key',
        placeholder: 'sk-...',
        value: 'sk-1234567890abcdef',
        showToggle: false,
    },
};

export const PortkeyExample: Story = {
    args: {
        label: 'Portkey API Key',
        placeholder: 'sk-...',
        required: true,
        helperText: 'Your API key is stored locally in your browser',
    },
    decorators: [
        (Story) => (
            <div style={{ width: '400px' }}>
                <Story />
            </div>
        ),
    ],
};

