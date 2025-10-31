import { AnimatedLogo } from '@client/components/side-bar/animated-logo';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

describe('AnimatedLogo', () => {
  it('should render the logo container', () => {
    const { container } = render(<AnimatedLogo isCollapsed={false} />);
    const logoContainer = container.querySelector('.relative.w-full.h-full');
    expect(logoContainer).toBeInTheDocument();
  });

  it('should display "Reactive Agents" text when expanded', () => {
    render(<AnimatedLogo isCollapsed={false} />);
    const expandedText = screen.getByText('Reactive Agents');
    expect(expandedText).toBeInTheDocument();
  });

  it('should display "RA" text when collapsed', () => {
    render(<AnimatedLogo isCollapsed={true} />);
    const collapsedText = screen.getByText('RA');
    expect(collapsedText).toBeInTheDocument();
  });

  it('should have both text elements in the DOM regardless of state', () => {
    render(<AnimatedLogo isCollapsed={false} />);
    const expandedText = screen.getByText('Reactive Agents');
    const collapsedText = screen.getByText('RA');

    expect(expandedText).toBeInTheDocument();
    expect(collapsedText).toBeInTheDocument();
  });

  it('should apply correct visibility styles when expanded', () => {
    render(<AnimatedLogo isCollapsed={false} />);
    const expandedText = screen.getByText('Reactive Agents');
    const collapsedText = screen.getByText('RA');

    expect(expandedText).toHaveStyle({ visibility: 'visible' });
    expect(collapsedText).toHaveStyle({ visibility: 'hidden' });
  });

  it('should apply correct visibility styles when collapsed', () => {
    render(<AnimatedLogo isCollapsed={true} />);
    const expandedText = screen.getByText('Reactive Agents');
    const collapsedText = screen.getByText('RA');

    expect(expandedText).toHaveStyle({ visibility: 'hidden' });
    expect(collapsedText).toHaveStyle({ visibility: 'visible' });
  });

  it('should render animated background gradient', () => {
    const { container } = render(<AnimatedLogo isCollapsed={false} />);
    const gradientBg = container.querySelector('.bg-linear-to-br');
    expect(gradientBg).toBeInTheDocument();
  });

  it('should render glowing orbs for animation', () => {
    const { container } = render(<AnimatedLogo isCollapsed={false} />);
    const orbs = container.querySelectorAll('.rounded-full.blur-2xl');
    // Should have 2 glowing orbs
    expect(orbs.length).toBeGreaterThanOrEqual(2);
  });

  it('should render pulsing rings for animation', () => {
    const { container } = render(<AnimatedLogo isCollapsed={false} />);
    const rings = container.querySelectorAll('.border-2.rounded-full');
    // Should have 2 pulsing rings
    expect(rings.length).toBe(2);
  });

  it('should have font-logo class on container', () => {
    const { container } = render(<AnimatedLogo isCollapsed={false} />);
    const logoContainer = container.querySelector('.font-logo');
    expect(logoContainer).toBeInTheDocument();
  });

  it('should apply correct text styling for expanded state', () => {
    render(<AnimatedLogo isCollapsed={false} />);
    const expandedText = screen.getByText('Reactive Agents');

    expect(expandedText).toHaveClass(
      'text-xl',
      'font-bold',
      'text-white',
      'whitespace-nowrap',
    );
  });

  it('should apply correct text styling for collapsed state', () => {
    render(<AnimatedLogo isCollapsed={true} />);
    const collapsedText = screen.getByText('RA');

    expect(collapsedText).toHaveClass(
      'text-xl',
      'font-bold',
      'text-white',
      'absolute',
    );
  });
});
