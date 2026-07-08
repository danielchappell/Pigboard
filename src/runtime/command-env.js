const DENY_ENV_PATTERNS = [
  /TOKEN/i,
  /SECRET/i,
  /PASSWORD/i,
  /^GH_/,
  /^GITHUB_/,
  /^OPENAI_/,
  /^CODEX_/,
  /^SSH_/,
  /^GIT_(?:ASKPASS|SSH|CONFIG|CREDENTIAL)/,
  /^NPM_TOKEN$/,
  /^NODE_AUTH_TOKEN$/,
  /^PYPI_TOKEN$/
];

export function buildRepoCommandEnv({ baseEnv = process.env, extraEnv = {}, tmpdir } = {}) {
  return buildScrubbedEnv({
    baseEnv,
    extraEnv,
    allow: ["PATH", "SHELL", "TMPDIR", "TEMP", "TMP", "LANG", "LC_ALL"],
    tmpdir
  });
}

export function buildCodexRunnerEnv({ baseEnv = process.env, extraEnv = {}, tmpdir } = {}) {
  return buildScrubbedEnv({
    baseEnv,
    extraEnv,
    allow: ["PATH", "SHELL", "TMPDIR", "TEMP", "TMP", "LANG", "LC_ALL"],
    tmpdir
  });
}

export function buildDaemonGitEnv({ baseEnv = process.env, githubToken, tmpdir } = {}) {
  const env = buildScrubbedEnv({
    baseEnv,
    allow: ["PATH", "SHELL", "TMPDIR", "TEMP", "TMP", "LANG", "LC_ALL", "HOME"],
    tmpdir
  });
  if (githubToken) env.GITHUB_TOKEN = githubToken;
  return env;
}

export function assertNoDeniedEnv(env) {
  for (const key of Object.keys(env)) {
    if (DENY_ENV_PATTERNS.some((pattern) => pattern.test(key))) {
      throw new Error(`Environment contains denied variable: ${key}`);
    }
  }
}

function buildScrubbedEnv({ baseEnv, extraEnv = {}, allow, tmpdir }) {
  const env = {};
  for (const key of allow) {
    if (baseEnv[key]) env[key] = baseEnv[key];
  }
  if (tmpdir) {
    env.TMPDIR = tmpdir;
    env.TEMP = tmpdir;
    env.TMP = tmpdir;
  }
  Object.assign(env, extraEnv);
  assertNoDeniedEnv(env);
  return env;
}
