/**
 * Fake SMS Gateway for local development and testing
 * Only logs formatted SMS details to console and returns a simulated success response.
 */
export async function sendFakeSms({ phone, message, senderId }) {
  const timestamp = new Date().toLocaleTimeString('bn-BD', { hour12: true });
  console.log(`\n================== 📨 [FAKE SMS GATEWAY] ==================`);
  console.log(`⏰ Time: ${timestamp}`);
  console.log(`📱 To: +88${phone}`);
  console.log(`🏷️ Sender ID: ${senderId || 'SOBUJ'}`);
  console.log(`📏 Length: ${message.length} characters`);
  console.log(`💬 Message Content:`);
  console.log(`   "${message}"`);
  console.log(`===========================================================\n`);

  return {
    success: true,
    messageId: `fake-${Date.now()}-${Math.random().toString(36).substring(7)}`,
    response: `Simulated OK (Fake driver at ${new Date().toISOString()})`,
  };
}
