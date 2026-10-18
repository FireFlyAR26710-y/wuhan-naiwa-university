export function validateSettings(settings) {
  if (new URL(settings.targetUrl).protocol !== 'https:') throw new Error('targetUrl must use HTTPS');
  if (!Number.isFinite(settings.countdownSeconds) || settings.countdownSeconds < 1 || settings.countdownSeconds > 60) throw new Error('countdownSeconds must be between 1 and 60');
  if (!Number.isSafeInteger(settings.historicalBase) || settings.historicalBase < 0) throw new Error('historicalBase must be a nonnegative safe integer');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(settings.counterSince)) throw new Error('counterSince must use YYYY-MM-DD');
}

export function deploymentSettings(deploy = {}, settings, env = {}) {
  validateSettings(settings);
  const preview = deploy.published === false || (deploy.published !== true && deploy.context !== 'production');
  const rawBase = env.NAIWA_HISTORICAL_BASE;
  const historicalBase = preview ? 0 : rawBase === undefined ? settings.historicalBase : Number(rawBase);
  if (!Number.isSafeInteger(historicalBase) || historicalBase < 0 || rawBase === '') throw new Error('Invalid NAIWA_HISTORICAL_BASE');
  return {
    storeName: `naiwa-escort-v1${preview ? `-preview-${deploy.id || 'local'}` : ''}`,
    historicalBase,
    targetUrl: settings.targetUrl,
    since: settings.counterSince
  };
}
