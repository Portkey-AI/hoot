import type { Meta, StoryObj } from '@storybook/react';
import { Textarea } from './Textarea';
import { useState } from 'react';

const meta: Meta<typeof Textarea> = {
    title: 'UI/Textarea',
    component: Textarea,
    parameters: {
        layout: 'padded',
    },
    tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Textarea>;

export const Default: Story = {
    args: {
        placeholder: 'Enter your text...',
    },
};

export const WithLabel: Story = {
    args: {
        label: 'Description',
        placeholder: 'Describe your tool...',
    },
};

export const Required: Story = {
    args: {
        label: 'Tool Schema',
        required: true,
        placeholder: 'Enter JSON schema...',
    },
};

export const WithHelperText: Story = {
    args: {
        label: 'Notes',
        helperText: 'Add any additional notes or comments',
        placeholder: 'Type your notes here...',
        rows: 4,
    },
};

export const WithError: Story = {
    args: {
        label: 'JSON Input',
        error: 'Invalid JSON format',
        placeholder: '{ "key": "value" }',
    },
};

export const Disabled: Story = {
    args: {
        label: 'System Log',
        value: 'This content cannot be edited.',
        disabled: true,
        rows: 3,
    },
};

export const CustomRows: Story = {
    args: {
        label: 'Long Content',
        placeholder: 'Enter long text...',
        rows: 8,
    },
};

export const Controlled: Story = {
    render: () => {
        const [value, setValue] = useState('');
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <Textarea
                    label="Message"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    placeholder="Type your message..."
                    rows={4}
                />
                <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                    Character count: {value.length}
                </p>
            </div>
        );
    },
};

export const JsonInput: Story = {
    args: {
        label: 'Tool Arguments',
        helperText: 'Enter tool arguments in JSON format',
        placeholder: `{
  "location": "San Francisco",
  "units": "metric"
}`,
        rows: 6,
    },
};

