import { config } from '../../config';

interface WebhookPayload {
  embeds: Array<{
    title: string;
    description: string;
    color: number;
    fields: Array<{ name: string; value: string; inline?: boolean }>;
    timestamp: string;
    footer?: { text: string };
  }>;
}

const COLORS = {
  warrant: 0xFF0000,
  caseOpen: 0xFF6B00,
  caseClosed: 0x22C55E,
};

export async function sendWarrantWebhook(
  citizenName: string,
  citizenid: string,
  reason: string,
  issuedByName: string,
  plate?: string,
): Promise<void> {
  const url = config.discord.webhookWarrants;

  const payload: WebhookPayload = {
    embeds: [{
      title: '🔴 LIVE WARRANT ISSUED',
      description: `A warrant has been issued for **${citizenName}**`,
      color: COLORS.warrant,
      fields: [
        { name: 'Citizen ID', value: citizenid, inline: true },
        { name: 'Name', value: citizenName, inline: true },
        ...(plate ? [{ name: 'Plate', value: plate, inline: true }] : []),
        { name: 'Reason', value: reason, inline: false },
        { name: 'Issued By', value: issuedByName, inline: true },
      ],
      timestamp: new Date().toISOString(),
      footer: { text: 'Reality MDT — Warrant Alert' },
    }],
  };

  if (config.demoMode) {
    console.log('\n═══════════════════════════════════════════');
    console.log('  [DEMO] WARRANT ALERT (suppressed)');
    console.log('  Citizen:', citizenName, `(${citizenid})`);
    console.log('  Reason:', reason);
    console.log('  Issued By:', issuedByName);
    console.log('  Plate:', plate || 'N/A');
    console.log('═══════════════════════════════════════════\n');
    return;
  }

  if (!url) return;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      console.error(`[Webhook] Failed to send warrant alert: ${res.status}`);
    }
  } catch (err) {
    console.error('[Webhook] Error sending warrant alert:', err);
  }
}
