# Welcome screen configuration

Edit `src/app/core/chat-ui.config.ts` and rebuild/restart as appropriate.

- `CHAT_UI.centerHeading`: heading above the center chat panel.
- `CHAT_UI.welcomeTitle`: title on the empty chat screen.
- `CHAT_UI.sidebarTitle`: name at the top of the left menu.
- `SUGGESTION_CARDS`: four initial cards, each with a stable unique id, icon,
  independently configurable title, subtitle, and prompt.

A card click submits its prompt through the same send flow as the composer.
The composer clears after submission; the sent text appears as a user message.
Blank prompts and clicks during an active request are ignored.
The previous prompts are retained as defaults; replace them with your supported
Overpayment Copilot queries in the configuration file.

Dynamic JSON/download tags, conversation state and report downloads are retained.
