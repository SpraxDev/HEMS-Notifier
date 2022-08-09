export type Queues = 'http.outgoing' | 'mail.outgoing';

export type HttpMessage = { method: 'POST' | 'GET', url: string, headers: { [key: string]: string }, bodyBase64?: string };
export type MailMessage = { from: string | { name: string, address: string }, to: string, subject: string, html?: string, text?: string };
