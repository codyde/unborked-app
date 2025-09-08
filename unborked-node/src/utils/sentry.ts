import crypto from 'crypto';
import * as dotenv from 'dotenv';

dotenv.config();

const SENTRY_WEBHOOK_URL = process.env.SENTRY_WEBHOOK_URL;
const WEBHOOK_SECRET = process.env.FEATURE_FLAG_WEBHOOK_SECRET;

if (!WEBHOOK_SECRET) {
    throw new Error('FATAL ERROR: FEATURE_FLAG_WEBHOOK_SECRET is not defined in the environment.');
}

// Ensure Sentry webhook URL ends with a trailing slash
const ensuredSentryUrl = SENTRY_WEBHOOK_URL && !SENTRY_WEBHOOK_URL.endsWith('/') 
    ? `${SENTRY_WEBHOOK_URL}/` 
    : SENTRY_WEBHOOK_URL;

function hmacSha256HexDigest(secret: string, message: string): string {
    return crypto.createHmac('sha256', secret)
                 .update(message, 'utf-8')
                 .digest('hex');
}

export async function sendSentryNotification(flagName: string, action: string, userId?: string, userType?: string) {
    console.log(`\n📣 SENDING SENTRY NOTIFICATION 📣`);
    console.log(`🏷️  Flag: ${flagName}`);
    console.log(`🔄  Action: ${action}`);
    
    const now = new Date();
    const createdAt = now.toISOString().replace(/\.\d{3}Z$/, '+00:00');
    const changeId = Math.floor(Date.now()).toString();
    
    console.log(`🔑 Using change_id: ${changeId}`);

    const payload = {
        meta: { version: 1 },
        data: [{
            action,
            change_id: changeId,
            created_at: createdAt,
            created_by: {
                id: userId || 'admin-menu@unborked.app',
                type: userType || 'email',
            },
            flag: flagName,
        }],
    };
    
    let body = JSON.stringify(payload);
    body = body.replace(/"change_id":"(\d+)"/g, '"change_id":$1');
    
    const signature = hmacSha256HexDigest(WEBHOOK_SECRET as string, body);
    
    try {
        const sentryResponse = await fetch(ensuredSentryUrl!, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json', 
                'X-Sentry-Signature': signature 
            },
            body,
        });
        
        if (!sentryResponse.ok) {
            const errorText = await sentryResponse.text();
            console.error(`❌ Sentry webhook notification failed for ${flagName}: ${sentryResponse.status}`);
            console.error(`❌ Response body: ${errorText}`);
            return false;
        }
        
        const responseBody = await sentryResponse.text();
        console.log(`✅ Sentry notification sent successfully for ${flagName} (${action}).`);
        console.log(`✅ Response body: ${responseBody}`);
        return true;
    } catch (error) {
        console.error(`❌ Error sending Sentry notification for ${flagName}:`, error);
        return false;
    } finally {
        console.log(`📣 SENTRY NOTIFICATION COMPLETE 📣\n`);
    }
} 