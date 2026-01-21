const axios = require('axios');

class TruIDClient {
  constructor() {
    this.apiKey = process.env.TRUID_API_KEY;
    this.subscriptionKey = process.env.TRUID_SUBSCRIPTION_KEY || process.env.TRUID_API_KEY;
    const configuredBase = process.env.TRUID_API_BASE || 'https://api.truidconnect.io';
    this.baseURL = configuredBase.replace(/\/$/, '');
    this.companyId = process.env.COMPANY_ID;
    this.brandId = process.env.BRAND_ID;
    this.redirectUrl = process.env.REDIRECT_URL;
    this.webhookUrl = process.env.WEBHOOK_URL;

    this.consultantClient = axios.create({
      baseURL: `${this.baseURL}/consultant-api`,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'Ocp-Apim-Subscription-Key': this.subscriptionKey
      },
      timeout: 10000
    });

    this.deliveryClient = axios.create({
      baseURL: `${this.baseURL}/delivery-api`,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'Ocp-Apim-Subscription-Key': this.subscriptionKey
      },
      timeout: 10000
    });
  }

  validateSetup() {
    const missing = [];
    if (!this.apiKey) missing.push('TRUID_API_KEY');
    if (!this.companyId) missing.push('COMPANY_ID');
    if (!this.brandId) missing.push('BRAND_ID');
    if (!this.redirectUrl) missing.push('REDIRECT_URL');
    if (!this.webhookUrl) missing.push('WEBHOOK_URL');
    if (!this.baseURL) missing.push('TRUID_API_BASE');

    if (missing.length) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
  }

  buildConsumerUrl(consentId) {
    if (!consentId) return null;
    const scheme = process.env.TRUID_SCHEME || 'https';
    const domain = process.env.TRUID_DOMAIN || 'hello.truidconnect.io';
    return `${scheme}://${domain}/consents/${consentId}`;
  }

  async createCollection(options = {}) {
    this.validateSetup();

    const {
      name,
      idNumber,
      idType = 'id',
      email,
      mobile,
      provider,
      accounts,
      auto,
      consentId,
      rememberMe,
      services,
      correlation,
      force
    } = options;

    if (!name || !idNumber) {
      throw new Error('Name and idNumber are required to create a collection.');
    }

    const payload = {
      name,
      idNumber,
      idType,
      brandId: this.brandId,
      ...(this.companyId && { companyId: this.companyId }),
      ...(email && { email }),
      ...(mobile && { mobile }),
      ...(provider && { provider }),
      ...(Array.isArray(accounts) && accounts.length ? { accounts } : {}),
      ...(typeof auto === 'boolean' ? { auto } : {}),
      ...(consentId && { consentId }),
      ...(rememberMe && { rememberMe }),
      ...(Array.isArray(services) && services.length ? { services } : {}),
      ...(correlation && Object.keys(correlation).length ? { correlation } : {}),
      ...(force ? { force: true } : {}),
      ...(this.redirectUrl && { redirectUrl: this.redirectUrl }),
      ...(this.webhookUrl && { webhookUrl: this.webhookUrl })
    };

    try {
      const response = await this.consultantClient.post('/collections', payload);
      console.log('TruID create response', {
        status: response.status,
        headers: response.headers,
        data: response.data
      });
      const locationHeader = response.headers['location'];
      const consentHeader = response.headers['x-consent'];
      const payloadData = typeof response.data === 'object' && response.data !== null ? response.data : null;
      const collectionId = this.extractCollectionId(locationHeader, payloadData?.id);
      const consumerUrl = this.resolveConsumerUrl(payloadData, consentHeader, locationHeader);

      return {
        success: true,
        status: response.status,
        collectionId,
        data: payloadData,
        consentId: consentHeader,
        consumerUrl
      };
    } catch (error) {
      throw this.normalizeError(error, 'Failed to create collection');
    }
  }

  resolveConsumerUrl(responseData, consentId, locationHeader) {
    if (responseData?.consumerUrl) return responseData.consumerUrl;
    if (responseData?.links?.consumer) return responseData.links.consumer;
    if (responseData?.inviteUrl) return responseData.inviteUrl;
    if (locationHeader) return locationHeader;
    return this.buildConsumerUrl(consentId);
  }

  async getCollection(collectionId) {
    this.validateSetup();

    try {
      const response = await this.consultantClient.get(`/collections/${collectionId}`);
      return {
        success: true,
        status: response.status,
        data: response.data
      };
    } catch (error) {
      throw this.normalizeError(error, 'Failed to retrieve collection');
    }
  }

  async getCollectionData(collectionId) {
    this.validateSetup();

    try {
      const response = await this.deliveryClient.get(`/collections/${collectionId}/products/summary`);
      return {
        success: true,
        status: response.status,
        data: response.data
      };
    } catch (error) {
      throw this.normalizeError(error, 'Failed to download collection data');
    }
  }

  extractCollectionId(locationHeader, fallback) {
    if (fallback) return fallback;
    if (!locationHeader) return null;

    try {
      const parts = locationHeader.split('/');
      return parts[parts.length - 1];
    } catch (_) {
      return null;
    }
  }

  normalizeError(error, defaultMessage) {
    const status = error.response?.status;
    const details = error.response?.data || error.message;
    const normalizedDetails = typeof details === 'string' ? details : JSON.stringify(details);
    const err = new Error(`${defaultMessage}: ${normalizedDetails}`);
    err.status = status || 500;
    return err;
  }
}

module.exports = new TruIDClient();
