import type { Meta, StoryObj } from '@storybook/react';
import { Spinner } from './Spinner';

const meta: Meta<typeof Spinner> = {
    title: 'UI/Spinner',
    component: Spinner,
    parameters: {
        layout: 'centered',
    },
    tags: ['autodocs'],
    argTypes: {
        size: {
            control: 'select',
            options: ['sm', 'md', 'lg'],
        },
        variant: {
            control: 'select',
            options: ['primary', 'secondary', 'white'],
        },
    },
};

export default meta;
type Story = StoryObj<typeof Spinner>;

export const Primary: Story = {
    args: {
        variant: 'primary',
    },
};

export const Secondary: Story = {
    args: {
        variant: 'secondary',
    },
};

export const White: Story = {
    render: () => (
        <div style={{ background: 'var(--bg-primary)', padding: '2rem', borderRadius: 'var(--radius-md)' }}>
            <Spinner variant="white" />
        </div>
    ),
};

export const Small: Story = {
    args: {
        size: 'sm',
    },
};

export const Medium: Story = {
    args: {
        size: 'md',
    },
};

export const Large: Story = {
    args: {
        size: 'lg',
    },
};

export const AllSizes: Story = {
    render: () => (
        <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
            <Spinner size="sm" />
            <Spinner size="md" />
            <Spinner size="lg" />
        </div>
    ),
};

export const AllVariants: Story = {
    render: () => (
        <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
            <Spinner variant="primary" />
            <Spinner variant="secondary" />
            <div style={{ background: 'var(--bg-primary)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
                <Spinner variant="white" />
            </div>
        </div>
    ),
};

export const InButton: Story = {
    render: () => (
        <button
            className="btn btn-primary btn-md"
            disabled
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
            <Spinner size="sm" variant="white" />
            Loading...
        </button>
    ),
};

export const LoadingState: Story = {
    render: () => (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1rem',
            padding: '2rem',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
        }}>
            <Spinner size="lg" />
            <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Loading data...</p>
        </div>
    ),
};

