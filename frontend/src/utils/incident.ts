import type { Incident } from '../types';

export function formatAlertType(type: string): string {
  return type
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function formatIncidentTitleAndSubtitle(incident: Incident): { title: string; subtitle: string } {
  const alerts = incident.alerts?.map((ia) => ia.alert) || [];

  if (alerts.length > 0) {
    const uniqueIPs = Array.from(new Set(alerts.map((a) => a.ip).filter(Boolean)));
    const uniqueTypes = Array.from(new Set(alerts.map((a) => a.type).filter(Boolean)));

    let title = '';
    const subtitle = uniqueTypes.join(', ');

    if (uniqueTypes.length === 1) {
      // 1 alert type: "{AlertType} from {sourceIP}"
      const formattedType = formatAlertType(uniqueTypes[0]);
      const sourceIP = uniqueIPs[0] || 'unknown source';
      title = `${formattedType} from ${sourceIP}`;
    } else if (uniqueIPs.length <= 1) {
      // Multiple alert types from the same host/IP
      const host = uniqueIPs[0] || 'unknown host';
      title = `Multi-vector attack from ${host}`;
    } else {
      // Multiple IPs
      title = `Coordinated attack — ${uniqueTypes.length} alert types detected`;
    }

    return { title, subtitle };
  }

  // Fallback if no alerts are loaded/present
  if (incident.title.includes('::')) {
    const [mainTitle, rawAlerts] = incident.title.split('::');
    return { title: mainTitle, subtitle: rawAlerts };
  }

  // If there's no delimiter and no alerts, use the original title as the title
  return { title: incident.title, subtitle: '' };
}
