const axios = require('axios');
const crypto = require('crypto');
const FormData = require('form-data');

class SamSubService {
  constructor() {
    this.apiUrl = process.env.SAMSUB_API_URL || 'https://api.sumsub.com';
    this.appToken = process.env.SAMSUB_APP_TOKEN;
    this.secretKey = process.env.SAMSUB_SECRET_KEY;
    this.appId = process.env.SAMSUB_APP_ID;

    if (!this.appToken || !this.secretKey || !this.appId) {
      throw new Error('SamSub credentials not configured. Please set SAMSUB_APP_TOKEN, SAMSUB_SECRET_KEY, and SAMSUB_APP_ID environment variables.');
    }
  }

  /**
   * Generate signature for SamSub API requests
   */
  generateSignature(method, url, body = '') {
    const timestamp = Math.floor(Date.now() / 1000);
    const message = `${timestamp}${method.toUpperCase()}${url}${body}`;
    
    const signature = crypto
      .createHmac('sha256', this.secretKey)
      .update(message)
      .digest('hex');

    return {
      timestamp,
      signature
    };
  }

  /**
   * Make authenticated request to SamSub API
   */
  async makeRequest(method, endpoint, data = null, isFormData = false) {
    console.log('Making SamSub API request:', {
      method,
      endpoint,
      data: isFormData ? '(form data)' : data
    });
    
    // Validate environment variables
    if (!this.appToken || !this.secretKey || !this.appId) {
      console.error('Missing SamSub credentials:', {
        hasAppToken: !!this.appToken,
        hasSecretKey: !!this.secretKey,
        hasAppId: !!this.appId
      });
      throw new Error('SamSub credentials missing. Check SAMSUB_APP_TOKEN, SAMSUB_SECRET_KEY, and SAMSUB_APP_ID environment variables.');
    }

    const url = endpoint;
    const body = data ? (isFormData ? '' : JSON.stringify(data)) : '';
    const { timestamp, signature } = this.generateSignature(method, url, body);

    const headers = {
      'X-App-Token': this.appToken,
      'X-App-Access-Sig': signature,
      'X-App-Access-Ts': timestamp.toString(),
    };

    if (!isFormData) {
      headers['Content-Type'] = 'application/json';
    }

    try {
      console.log('SamSub API URL:', `${this.apiUrl}${url}`);
      console.log('SamSub request headers:', headers);

      const config = {
        method,
        url: `${this.apiUrl}${url}`,
        headers,
        validateStatus: false // Don't throw on any status
      };

      if (data) {
        config.data = data;
      }

      const response = await axios(config);
      
      // Log the complete response for debugging
      console.log('SamSub API Response:', {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        data: response.data
      });

      // Handle non-200 responses explicitly
      if (response.status !== 200) {
        throw new Error(JSON.stringify({
          status: response.status,
          message: response.data?.description || response.statusText,
          details: response.data
        }));
      }

      return response.data;
    } catch (error) {
      console.error('SamSub API Error:', {
        message: error.message,
        response: error.response?.data,
        stack: error.stack
      });
      
      // Ensure we always return a properly formatted error
      throw new Error(JSON.stringify({
        message: error.response?.data?.description || error.message,
        details: error.response?.data || error
      }));
    }
  }

  /**
   * Create a new applicant
   */
  async createApplicant({ externalUserId, levelName, email, firstName, lastName, phone }) {
    const applicantData = {
      externalUserId,
      info: {}
    };

    if (email) applicantData.info.email = email;
    if (firstName) applicantData.info.firstName = firstName;
    if (lastName) applicantData.info.lastName = lastName;
    if (phone) applicantData.info.phone = phone;

    const endpoint = `/resources/applicants?levelName=${levelName}`;
    return await this.makeRequest('POST', endpoint, applicantData);
  }

  /**
   * Upload document for verification
   */
  async uploadDocument(applicantId, { documentType, fileName, fileBuffer, mimeType }) {
    const formData = new FormData();
    formData.append('content', fileBuffer, {
      filename: fileName,
      contentType: mimeType
    });

    const endpoint = `/resources/applicants/${applicantId}/info/idDoc`;
    const url = endpoint;
    const { timestamp, signature } = this.generateSignature('POST', url, '');

    try {
      const response = await axios.post(`${this.apiUrl}${endpoint}`, formData, {
        headers: {
          ...formData.getHeaders(),
          'X-App-Token': this.appToken,
          'X-App-Access-Sig': signature,
          'X-App-Access-Ts': timestamp.toString(),
        },
        params: {
          idDocType: documentType
        }
      });

      return response.data;
    } catch (error) {
      console.error('Document upload error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.description || error.message);
    }
  }

  /**
   * Get applicant status and verification results
   */
  async getApplicantStatus(applicantId) {
    const endpoint = `/resources/applicants/${applicantId}/status`;
    return await this.makeRequest('GET', endpoint);
  }

  /**
   * Generate access token for SamSub SDK
   */
  async generateAccessToken(applicantId, levelName) {
    const endpoint = `/resources/accessTokens?userId=${applicantId}&levelName=${levelName || 'test-level'}`;
    const response = await this.makeRequest('POST', endpoint);
    return response.token;
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(payload, receivedSignature) {
    if (!receivedSignature) {
      return false;
    }

    const payloadString = JSON.stringify(payload);
    const expectedSignature = crypto
      .createHmac('sha256', this.secretKey)
      .update(payloadString)
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(receivedSignature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  }

  /**
   * Get applicant data
   */
  async getApplicantData(applicantId) {
    const endpoint = `/resources/applicants/${applicantId}/one`;
    return await this.makeRequest('GET', endpoint);
  }

  /**
   * Reset applicant (for resubmission)
   */
  async resetApplicant(applicantId) {
    const endpoint = `/resources/applicants/${applicantId}/reset`;
    return await this.makeRequest('POST', endpoint);
  }

  /**
   * Get verification documents
   */
  async getDocuments(applicantId) {
    const endpoint = `/resources/applicants/${applicantId}/info/idDoc`;
    return await this.makeRequest('GET', endpoint);
  }

  /**
   * Get applicant levels (simplified mock for now)
   */
  async getApplicantLevels() {
    // Mock response since this endpoint might not be available in all Sumsub accounts
    return {
      levels: [
        { name: 'test-level', description: 'Test verification level' },
        { name: 'basic-kyc-level', description: 'Basic KYC verification' },
        { name: 'advanced-kyc-level', description: 'Advanced KYC verification' }
      ]
    };
  }

  /**
   * Request applicant check (starts the verification process)
   */
  async requestApplicantCheck(applicantId) {
    const endpoint = `/resources/applicants/${applicantId}/status/pending`;
    return await this.makeRequest('POST', endpoint);
  }

  /**
   * Generate WebSDK link for automated verification UI
   * Uses the proper SamSub API endpoint to generate external shareable links
   */
  async generateWebSDKLink({ applicantId, externalUserId, levelName, email, phone }) {
    try {
      // Log the request parameters for debugging
      console.log('Generating WebSDK link with params:', {
        applicantId,
        externalUserId,
        levelName,
        email: email ? 'provided' : 'not provided',
        phone: phone ? 'provided' : 'not provided'
      });

      // Use the correct SamSub API endpoint for generating external WebSDK links
      const endpoint = `/resources/sdkIntegrations/levels/-/websdkLink`;
      
      const requestBody = {
        levelName: levelName || 'test-level',
        ttlInSecs: 1800 // 30 minutes expiry
      };

      // Use applicantId if available, otherwise use externalUserId
      if (applicantId) {
        requestBody.applicantId = applicantId;
      } else if (externalUserId) {
        requestBody.userId = externalUserId;
        
        // Add optional applicant identifiers for new users
        if (email || phone) {
          requestBody.applicantIdentifiers = {};
          if (email) requestBody.applicantIdentifiers.email = email;
          if (phone) requestBody.applicantIdentifiers.phone = phone;
        }
      } else {
        throw new Error('Either applicantId or externalUserId must be provided');
      }

      const response = await this.makeRequest('POST', endpoint, requestBody);
      
      return {
        url: response.url, // This is the proper external shareable link from SamSub
        applicantId: applicantId,
        externalUserId: externalUserId,
        levelName: levelName || 'test-level',
        expiresInSeconds: 1800,
        instructions: 'External WebSDK link for automated document verification - can be shared directly or used as QR code',
        type: 'external_permalink'
      };
    } catch (error) {
      console.error('WebSDK link generation failed:', error.message);
      throw new Error(`Failed to generate verification link: ${error.message}`);
    }
  }
}

module.exports = new SamSubService();