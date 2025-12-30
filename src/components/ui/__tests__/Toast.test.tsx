import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { toast } from 'sonner';
import { Toaster } from '../sonner';

describe('Toast Component', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should render toaster container', async () => {
    render(<Toaster />);
    // sonner might render the container only after a short delay or first toast
    await act(async () => {
      toast('Init');
    });
    await waitFor(() => {
      expect(document.querySelector('[data-sonner-toaster]')).toBeInTheDocument();
    });
  });

  it('should display success toast', async () => {
    render(<Toaster />);

    act(() => {
      toast.success('Operation successful!');
    });

    await waitFor(() => {
      expect(screen.getByText('Operation successful!')).toBeInTheDocument();
    });
  });

  it('should display error toast', async () => {
    render(<Toaster />);

    act(() => {
      toast.error('Something went wrong!');
    });

    await waitFor(() => {
      expect(screen.getByText('Something went wrong!')).toBeInTheDocument();
    });
  });

  it('should display toast with title and description', async () => {
    render(<Toaster />);

    act(() => {
      toast('Title', {
        description: 'Description text',
      });
    });

    await waitFor(() => {
      expect(screen.getByText('Title')).toBeInTheDocument();
      expect(screen.getByText('Description text')).toBeInTheDocument();
    });
  });

  it('should display loading toast', async () => {
    render(<Toaster />);

    act(() => {
      toast.loading('Loading...');
    });

    await waitFor(() => {
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });
  });

  it('should display info toast', async () => {
    render(<Toaster />);

    act(() => {
      toast.info('Information message');
    });

    await waitFor(() => {
      expect(screen.getByText('Information message')).toBeInTheDocument();
    });
  });

  it('should display warning toast', async () => {
    render(<Toaster />);

    act(() => {
      toast.warning('Warning message');
    });

    await waitFor(() => {
      expect(screen.getByText('Warning message')).toBeInTheDocument();
    });
  });
});
