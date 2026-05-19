import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';
import { system } from '@/styles/theme';
import { HighlightedText } from './HighlightedText';

function renderText(text: string, query: string) {
  return render(
    <ChakraProvider value={system}>
      <span data-testid="root">
        <HighlightedText text={text} query={query} />
      </span>
    </ChakraProvider>
  );
}

describe('HighlightedText', () => {
  it('renders the full text when query is empty', () => {
    renderText('Chicken breast', '');
    expect(screen.getByTestId('root')).toHaveTextContent('Chicken breast');
  });

  it('renders the full text when query does not match', () => {
    renderText('Chicken breast', 'beef');
    expect(screen.getByTestId('root')).toHaveTextContent('Chicken breast');
  });

  it('renders all three parts when query matches in the middle', () => {
    renderText('Chicken breast', 'ken');
    const root = screen.getByTestId('root');
    expect(root).toHaveTextContent('Chicken breast');
    expect(root.querySelector('span')).toHaveTextContent('ken');
  });

  it('matches case-insensitively', () => {
    renderText('Chicken breast', 'CHICK');
    const root = screen.getByTestId('root');
    expect(root.querySelector('span')).toHaveTextContent('Chick');
  });

  it('highlights from the start when query matches the beginning', () => {
    renderText('Chicken', 'Chic');
    expect(screen.getByTestId('root').querySelector('span')).toHaveTextContent('Chic');
  });

  it('highlights to the end when query matches the end', () => {
    renderText('Chicken', 'ken');
    expect(screen.getByTestId('root').querySelector('span')).toHaveTextContent('ken');
  });
});
