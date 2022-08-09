import { type as osType } from 'os';
import { agent, get, parse as agentParsers, post, Response, SuperAgentRequest, SuperAgentStatic } from 'superagent';

import { appVersion } from '..';

const agents: { [key: string]: SuperAgentStatic } = {};

/**
 * @param url The URL to send the request to
 * @param headers Optional. Headers to send with the request (additionally to the default headers)
 */
export async function httpGet(url: string, headers?: { [key: string]: string }): Promise<{ res: Response, body: Buffer }> {
    return new Promise((resolve, reject) => {
        applyDefaults(get(url), headers)
                .end(getReqHandler(resolve, reject));
    });
}

/**
 * @param url The URL to send the request to
 * @param headers Optional. Headers to send with the request (additionally to the default headers)
 * @param body Optional. The request body to send
 */
export async function httpPost(url: string, headers?: { [key: string]: string }, body?: string | object): Promise<{ res: Response, body: Buffer }> {
    return new Promise((resolve, reject) => {
        applyDefaults(post(url), headers, body)
                .end(getReqHandler(resolve, reject));
    });
}

export function applyDefaults(req: SuperAgentRequest, headers?: { [key: string]: string }, body?: string | object): SuperAgentRequest {
    // set own default headers
    req.set('User-Agent', getUserAgent());

    // Set optional headers
    if (headers) {
        for (const header in headers) {
            if (Object.prototype.hasOwnProperty.call(headers, header)) {
                req.set(header, headers[header]);
            }
        }
    }

    // Force the response body to be a Buffer instead of a String
    req.buffer(true)
            .parse(agentParsers['application/octet-stream']);

    // Set optional body
    if (body) {
        req.send(body);
    }

    // Return same req for chaining
    return req;
}

export function getReqHandler(resolve: Function, reject: Function): (err: any, res: Response) => void {
    return (err, res) => {
        if (err && !res) return reject(err);  // An error occurred (http errors are excluded! 404 is not an error in my eyes as the request itself was successful)

        return resolve({res, body: res.body});
    };
}

/**
 * This function returns an existing agent or creates one if not.
 *
 * An agent allows you to make requests with cookies (automatically).
 * Each agent has its own cookie jar.
 *
 * @param identifier A unique identifier to use
 */
export function getCachedAgent(identifier: string): SuperAgentStatic {
    if (!agents[identifier]) {
        agents[identifier] = agent();
    }

    return agents[identifier];
}

export function getUserAgent(): string {
    return `HEMS-Notifier/${appVersion} (${osType()}; ${process.arch}; ${process.platform}) (+https://hems.sprax2013.de/notifier)`;
}