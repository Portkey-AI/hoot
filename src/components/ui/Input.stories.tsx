import type { Meta, StoryObj } from '@storybook/react';
import { Input } from './Input';
import { useState } from 'react';

const meta: Meta<typeof Input> = {
    title: 'UI/Input',
    component: Input,
    parameters: {
        layout: 'padded',
    },
    tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Input>;

export const Default: Story = {
    args: {
        placeholder: 'Enter text...',
    },
};

export const WithLabel: Story = {
    args: {
        label: 'Server Name',
        placeholder: 'my-server',
    },
};

export const Required: Story = {
    args: {
        label: 'API Key',
        required: true,
        placeholder: 'sk-...',
    },
};

export const WithHelperText: Story = {
    args: {
        label: 'Email',
        helperText: 'We will never share your email.',
        placeholder: 'you@example.com',
        type: 'email',
    },
};

export const WithError: Story = {
    args: {
        label: 'Username',
        error: 'Username is already taken',
        placeholder: 'username',
    },
};

export const Disabled: Story = {
    args: {
        label: 'Server ID',
        value: 'srv_123456',
        disabled: true,
    },
};

export const Password: Story = {
    args: {
        label: 'Password',
        type: 'password',
        placeholder: '••••••••',
    },
};

export const Controlled: Story = {
    render: () => {
        const [value, setValue] = useState('');
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <Input
                    label="Controlled Input"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    placeholder="Type something..."
                />
                <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                    Value: {value || '(empty)'}
                </p>
            </div>
        );
    },
};

