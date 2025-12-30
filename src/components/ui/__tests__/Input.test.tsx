import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Input } from '../input';

describe('Input Component', () => {
  it('should render input element', () => {
    render(<Input placeholder="Enter text" />);
    expect(screen.getByPlaceholderText('Enter text')).toBeInTheDocument();
  });

  it('should handle value changes', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();

    render(<Input onChange={handleChange} />);
    const input = screen.getByRole('textbox');

    await user.type(input, 'Hello');
    expect(handleChange).toHaveBeenCalled();
  });

  it('should display controlled value', () => {
    render(<Input value="Controlled value" readOnly />);
    expect(screen.getByDisplayValue('Controlled value')).toBeInTheDocument();
  });

  it('should be disabled when disabled prop is true', () => {
    render(<Input disabled placeholder="Disabled" />);
    expect(screen.getByPlaceholderText('Disabled')).toBeDisabled();
  });

  it('should accept different types', () => {
    const { rerender } = render(<Input type="text" placeholder="text" />);
    expect(screen.getByPlaceholderText('text')).toHaveAttribute('type', 'text');

    rerender(<Input type="email" placeholder="email" />);
    expect(screen.getByPlaceholderText('email')).toHaveAttribute('type', 'email');

    rerender(<Input type="password" placeholder="password" />);
    expect(screen.getByPlaceholderText('password')).toHaveAttribute('type', 'password');

    rerender(<Input type="number" placeholder="number" />);
    expect(screen.getByPlaceholderText('number')).toHaveAttribute('type', 'number');
  });

  it('should support className prop', () => {
    render(<Input className="custom-class" placeholder="styled" />);
    expect(screen.getByPlaceholderText('styled')).toHaveClass('custom-class');
  });

  it('should handle focus and blur events', () => {
    const handleFocus = vi.fn();
    const handleBlur = vi.fn();

    render(<Input onFocus={handleFocus} onBlur={handleBlur} placeholder="focus test" />);
    const input = screen.getByPlaceholderText('focus test');

    fireEvent.focus(input);
    expect(handleFocus).toHaveBeenCalledTimes(1);

    fireEvent.blur(input);
    expect(handleBlur).toHaveBeenCalledTimes(1);
  });

  it('should support maxLength attribute', async () => {
    const user = userEvent.setup();
    render(<Input maxLength={5} placeholder="max length" />);

    const input = screen.getByPlaceholderText('max length');
    await user.type(input, '12345678');

    expect(input).toHaveValue('12345');
  });
});
