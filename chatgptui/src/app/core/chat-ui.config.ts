/** Edit these values to customize the chat welcome screen. Rebuild after changes. */
export interface SuggestionCard {
  readonly id: string;
  readonly icon: string;
  readonly title: string;
  readonly subtitle: string;
  /** Exact text submitted to the chat API when the card is clicked. */
  readonly prompt: string;
}

export const CHAT_UI = {
  centerHeading: 'Welcome Akhila to the Overpayment Copilot',
  welcomeTitle: 'How can we assist today?',
  sidebarTitle: 'OP Copilot'
} as const;

/** Each card has independently configurable display text and submission text. */
export const SUGGESTION_CARDS: readonly SuggestionCard[] = [
  {
    id: 'write', icon: 'edit',
    title: 'Write something',
    subtitle: 'Find the right words',
    prompt: 'Write a friendly follow-up email.'
  },
  {
    id: 'plan', icon: 'idea',
    title: 'Make a plan',
    subtitle: 'Turn an idea into action',
    prompt: 'Help me plan a productive day.'
  },
  {
    id: 'code', icon: 'code',
    title: 'Build code',
    subtitle: 'Solve your next challenge',
    prompt: 'How should I structure an Angular project?'
  },
  {
    id: 'learn', icon: 'book',
    title: 'Learn something',
    subtitle: 'Make the complex simple',
    prompt: 'Help me understand a new topic.'
  }
];
