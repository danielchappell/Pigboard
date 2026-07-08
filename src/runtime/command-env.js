const DENY_ENV_PATTERNS = [
  /TOKEN/i,
  /SECRET/i,
  /PASSWORD/i,
  /^GH_/,
  /^GITHUB_/,
  /^OPENAI_/,
  /^CODEX_(?!HOME$)/,
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
    allow: ["PATH", "SHELL", "TMPDIR", "TEMP", "TMP", "LANG", "LC_ALL", "HOME", "CODEX_HOME"],
    tmpdir
  });
}

export function buildDaemonGitEnv({ baseEnv = process.env, githubToken, tmpdir } = {}) {
  const env = buildScrubbedEnv({
    baseEnv,
    allow: ["PATH", "SHELL", "TMPDIR", "TEMP", "TMP", "LANG", "LC_ALL", "HOME"],
    tmpdir
  });
  env.GIT_TERMINAL_PROMPT = "0";
  if (githubToken) {
    env.GIT_CONFIG_COUNT = "1";
    env.GIT_CONFIG_KEY_0 = "http.https://github.com/.extraheader";
    env.GIT_CONFIG_VALUE_0 = `AUTHORIZATION: basic ${Buffer.from(`x-access-token:${githubToken}`).toString("base64")}`;
  }
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
