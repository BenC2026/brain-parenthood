import React from 'react';
import { render, screen } from '@testing-library/react';
import ProgressBar from '@/components/ui/ProgressBar';

describe('ProgressBar', () => {
  it('renders a progressbar element', () => {
    render(<ProgressBar value={50} />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('sets aria-valuenow to the raw value', () => {
    render(<ProgressBar value={30} max={100} />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '30');
  });

  it('sets aria-valuemin to 0 and aria-valuemax to max', () => {
    render(<ProgressBar value={5} max={10} />);
    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-valuemin', '0');
    expect(bar).toHaveAttribute('aria-valuemax', '10');
  });

  it('calculates width as percentage of max', () => {
    render(<ProgressBar value={3} max={12} />);
    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveStyle({ width: '25%' });
  });

  it('clamps width to 100% when value exceeds max', () => {
    render(<ProgressBar value={150} max={100} />);
    expect(screen.getByRole('progressbar')).toHaveStyle({ width: '100%' });
  });

  it('clamps width to 0% when value is negative', () => {
    render(<ProgressBar value={-10} max={100} />);
    expect(screen.getByRole('progressbar')).toHaveStyle({ width: '0%' });
  });

  it('shows percentage text when showPercentage is true', () => {
    render(<ProgressBar value={75} showPercentage />);
    expect(screen.getByText('75%')).toBeInTheDocument();
  });

  it('hides percentage text by default', () => {
    render(<ProgressBar value={75} />);
    expect(screen.queryByText('75%')).not.toBeInTheDocument();
  });

  it('displays label when provided', () => {
    render(<ProgressBar value={50} label="Module Progress" />);
    expect(screen.getByText('Module Progress')).toBeInTheDocument();
  });

  it('applies gradient variant styles by default', () => {
    render(<ProgressBar value={50} />);
    const bar = screen.getByRole('progressbar');
    expect(bar.className).toContain('bg-gradient-to-r');
  });

  it('applies primary variant styles', () => {
    render(<ProgressBar value={50} variant="primary" />);
    expect(screen.getByRole('progressbar').className).toContain('bg-primary-500');
  });

  it('applies success variant styles', () => {
    render(<ProgressBar value={50} variant="success" />);
    expect(screen.getByRole('progressbar').className).toContain('bg-success-500');
  });

  it('applies sm size styles', () => {
    const { container } = render(<ProgressBar value={50} size="sm" />);
    const track = container.querySelector('.h-1\\.5');
    expect(track).toBeInTheDocument();
  });

  it('applies lg size styles', () => {
    const { container } = render(<ProgressBar value={50} size="lg" />);
    const track = container.querySelector('.h-3');
    expect(track).toBeInTheDocument();
  });

  it('rounds displayed percentage', () => {
    render(<ProgressBar value={1} max={3} showPercentage />);
    expect(screen.getByText('33%')).toBeInTheDocument();
  });
});
