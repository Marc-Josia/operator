// OpenCode adapter — verify-only.
//
// OpenCode reads AGENTS.md and discovers skills in .agents/skills/ natively,
// so there is nothing to write. Applying just confirms that to the operator.

import fs from 'node:fs';
import path from 'node:path';

export default {
  name: 'opencode',

  detect(cwd) {
    return (
      fs.existsSync(path.join(cwd, '.opencode')) ||
      fs.existsSync(path.join(cwd, 'opencode.json')) ||
      fs.existsSync(path.join(cwd, 'opencode.jsonc'))
    );
  },

  apply() {
    return ['OpenCode reads AGENTS.md and .agents/skills/ natively — nothing to write'];
  },

  check() {
    return [];
  },

  remove() {
    return { removed: [], kept: [] };
  },
};
