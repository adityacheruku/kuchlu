import { registerPlugin } from '@capacitor/core';

import type { AssistiveTouchPluginPlugin } from './definitions';

const AssistiveTouchPlugin = registerPlugin<AssistiveTouchPluginPlugin>('AssistiveTouchPlugin', {
  web: () => import('./web').then((m) => new m.AssistiveTouchPluginWeb()),
});

export * from './definitions';
export { AssistiveTouchPlugin };
