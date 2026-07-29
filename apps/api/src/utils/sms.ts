export async function sendSMS({ to, message }: { to: string; message: string }) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM || process.env.TWILIO_FROM_NUMBER;

  if (!accountSid || !authToken || !from) {
    console.log('----------------------------------------');
    console.log(`[MOCK SMS] To: ${to}`);
    console.log(`Message: ${message}`);
    console.log('----------------------------------------');
    return;
  }

  try {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
    
    const params = new URLSearchParams();
    params.append('To', to);
    params.append('From', from);
    params.append('Body', message);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errText = await response.text();
      console.error(`Twilio send failure: status ${response.status}, response: ${errText}`);

      // Auto-retry for Twilio Trial Account restriction (Error 572006 / Predefined template required)
      if (errText.includes('572006') || errText.includes('predefined SMS templates')) {
        const extractedOtp = message.match(/\b\d{6}\b/)?.[0];
        if (extractedOtp) {
          console.log(`[TWILIO RETRY] Retrying with predefined trial template for OTP: ${extractedOtp}`);
          const trialParams = new URLSearchParams();
          trialParams.append('To', to);
          trialParams.append('From', from);
          trialParams.append('Body', `Your verification code is: ${extractedOtp}`);

          const trialController = new AbortController();
          const trialTimeout = setTimeout(() => trialController.abort(), 5000);
          const trialResponse = await fetch(url, {
            method: 'POST',
            headers: {
              'Authorization': `Basic ${auth}`,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: trialParams.toString(),
            signal: trialController.signal,
          });
          clearTimeout(trialTimeout);

          if (trialResponse.ok) {
            console.log(`[TWILIO RETRY SUCCESS] Sent trial compliant SMS to ${to}`);
          } else {
            const trialErr = await trialResponse.text();
            console.error(`Twilio trial retry failure: status ${trialResponse.status}, response: ${trialErr}`);
          }
        }
      }
    }
  } catch (error) {
    console.error('Twilio SMS send error:', error);
  }
}
