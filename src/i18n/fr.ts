import type { MsgKey } from './index';
import { en } from './en';

// TODO(stage 2): real translations. Until then this falls back to English.
export const fr: Record<MsgKey, string> = { ...en };
