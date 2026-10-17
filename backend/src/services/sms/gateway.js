import axios from 'axios';
import { env } from '../../config/env.js';
import { sendFakeSms } from './fakeGateway.js';

/**
 * Dispatches an SMS either to the real Bangladeshi HTTP gateway or to the fake gateway.
 *
 * @param {Object} params
 * @param {string} params.phone - 11 digit Bangladeshi phone number (e.g. 01712345678)
 * @param {string} params.message - Unicode text message
 * @param {Object} [params.settings] - Configuration map from settings table
 * @returns {Promise<{success: boolean, response: string, messageId?: string}>}
 */
export async function sendSms({ phone, message, settings = {} }) {
  const driver = env.SMS_DRIVER || 'fake';

  // If driver is fake or not explicitly 'real', use fake gateway
  if (driver !== 'real') {
    return await sendFakeSms({
      phone,
      message,
      senderId: settings.sms_sender_id || env.SMS_SENDER_ID || '',
    });
  }

  // Real HTTP API gateway dispatch
  const apiUrl = settings.sms_api_url || env.SMS_API_URL;
  const apiKey = settings.sms_api_key || env.SMS_API_KEY;
  const senderId = settings.sms_sender_id || env.SMS_SENDER_ID || '';

  if (!apiUrl || !apiKey) {
    throw new Error('SMS API URL বা API Key কনফিগার করা নেই। অনুগ্রহ করে সেটিংস পেজ থেকে কনফিগার করুন।');
  }

  const cleanPhone = phone.replace(/\D/g, '');
  const formattedNumber = cleanPhone.startsWith('88') ? cleanPhone : `88${cleanPhone}`;

  try {
    const payload = {
      api_key: apiKey,
      sender_id: senderId,
      senderid: senderId,
      number: formattedNumber,
      contacts: formattedNumber,
      message,
      msg: message,
    };

    const response = await axios.post(apiUrl, payload, {
      timeout: 15000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    const respText =
      typeof response.data === 'object'
        ? JSON.stringify(response.data)
        : String(response.data);

    return {
      success: true,
      response: respText,
    };
  } catch (error) {
    const errorMsg =
      error.response?.data?.message ||
      (typeof error.response?.data === 'string' ? error.response.data : null) ||
      error.message ||
      'গেটওয়ে থেকে অপ্রত্যাশিত ত্রুটি পাওয়া গেছে।';

    throw new Error(errorMsg);
  }
}
