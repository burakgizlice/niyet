// Block 4: single source of truth for completion/entrance animation timing.
// Imported by useQueue, TaskCard, and reused by Blocks 5-7 (reward effects).
// Mirrors the named-export convention of src/constants/cardRamp.js.
export const COMPLETION_ANIMATION_MS = 500
export const CARD_ENTER_ANIMATION_MS = 350
// Block 6: hold between tap and card-exit start. Sized so the ~300ms checkmark
// draw fully completes (+50ms buffer) before the exit slide/fade begins.
export const REWARD_WINDOW_MS = 350
export const EXIT_EASING = 'cubic-bezier(.4,0,.2,1)'
export const ENTER_EASING = 'cubic-bezier(.4,0,.2,1)'
