import { getStore } from '@netlify/blobs';
import { counterHandler } from '../lib/escort-counter.mjs';
import { deploymentSettings } from '../lib/settings.mjs';
import settings from '../../site.config.json' with {type: 'json'};

export default async (request, context) => {
  const {storeName, ...options} = deploymentSettings(context.deploy, settings, process.env);
  const store = getStore({name: storeName, consistency: 'strong'});
  return counterHandler(store, options)(request);
};

export const config = {path: '/api/escort-count', method: ['GET', 'POST']};
