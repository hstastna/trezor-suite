import languageHeaderParser from 'accept-language-parser';

import {
    HttpServer,
    allowOrigins,
    parseBodyJSON,
    parseBodyText,
    Handler,
} from '@trezor/node-utils';
import { Descriptor } from '@trezor/transport/src/types';
import { Log, arrayPartition } from '@trezor/utils';

import { sessionsClient, createApi } from './core';

const defaults = {
    port: 21325,
};

const str = (value: Record<string, any> | string) => JSON.stringify(value);

export class TrezordNode {
    /** versioning, baked in by webpack */
    version = '3.0.0';
    serviceName = 'trezord-node';
    /** last known descriptors state */
    descriptors: Descriptor[];
    /** pending /listen subscriptions that are supposed to be resolved whenever descriptors change is detected */
    listenSubscriptions: {
        descriptors: string;
        req: Parameters<Handler>[0];
        res: Parameters<Handler>[1];
    }[];
    port: number;
    server?: HttpServer<never>;
    api: ReturnType<typeof createApi>;
    logger = new Log('@trezor/transport-bridge', true);

    constructor({ port, api }: { port: number; api: 'usb' | 'udp' }) {
        this.port = port || defaults.port;

        this.descriptors = [];

        this.listenSubscriptions = [];

        // whenever sessions module reports changes to descriptors (including sessions), resolve affected /listen subscriptions
        sessionsClient.on('descriptors', descriptors => {
            this.resolveListenSubscriptions(descriptors);
        });
        this.api = createApi(api, this.logger);
    }

    private resolveListenSubscriptions(descriptors: Descriptor[]) {
        this.descriptors = descriptors;
        const [affected, unaffected] = arrayPartition(
            this.listenSubscriptions,
            subscription => subscription.descriptors !== JSON.stringify(this.descriptors),
        );
        affected.forEach(subscription => {
            subscription.res.end(str(this.descriptors));
        });
        this.listenSubscriptions = unaffected;
    }

    public start() {
        return new Promise<void>(resolve => {
            this.logger.info('Starting Trezor Bridge HTTP server');
            const app = new HttpServer({
                port: this.port,
                logger: this.logger,
            });

            app.use([
                (req, res, next, context) => {
                    // directly navigating to status page of bridge in browser. when request is not issued by js, there is no origin header
                    if (
                        !req.headers.origin &&
                        req.headers.host &&
                        [`127.0.0.1:${this.port}`, `localhost:${this.port}`].includes(
                            req.headers.host,
                        )
                    ) {
                        next(req, res);
                    } else {
                        allowOrigins(['https://sldev.cz', 'https://trezor.io', 'http://localhost'])(
                            req,
                            res,
                            next,
                            context,
                        );
                    }
                },
            ]);

            // origin was checked in previous app.use. if it didn't not satisfy the check, it did not move on to this handler
            app.use([
                (req, res, next) => {
                    if (req.headers.origin) {
                        res.setHeader('Access-Control-Allow-Origin', req.headers.origin);
                    }
                    next(req, res);
                },
            ]);

            app.post('/enumerate', [
                (_req, res) => {
                    res.setHeader('Content-Type', 'text/plain');
                    this.api.enumerate().then(result => {
                        if (!result.success) {
                            res.statusCode = 400;
                            return res.end(str({ error: result.error }));
                        }
                        res.end(str(result.payload.descriptors));
                    });
                },
            ]);

            app.post('/listen', [
                parseBodyJSON,
                (req, res) => {
                    res.setHeader('Content-Type', 'text/plain');
                    this.listenSubscriptions.push({
                        // todo: type in that if parseBodyText was called as previous handler, req.body is string. is that even possible
                        // @ts-expect-error
                        descriptors: req.body,
                        req,
                        res,
                    });
                },
            ]);

            app.post('/acquire/:path/:previous', [
                parseBodyJSON,
                (req, res) => {
                    res.setHeader('Content-Type', 'text/plain');
                    this.api
                        .acquire(
                            { path: req.params.path, previous: req.params.previous },
                            // @ts-expect-error
                            { instanceId: req.body.instanceId },
                        )
                        .then(result => {
                            if (!result.success) {
                                res.statusCode = 400;
                                return res.end(str({ error: result.error }));
                            }
                            res.end(str({ session: result.payload.session }));
                        });
                },
            ]);

            app.post('/release/:session', [
                parseBodyText,
                (req, res) => {
                    this.api
                        .release({
                            session: req.params.session,
                            // @ts-expect-error
                            path: req.body,
                        })
                        .then(result => {
                            if (!result.success) {
                                res.statusCode = 400;
                                return res.end(str({ error: result.error }));
                            }
                            res.end(str({ session: req.params.session }));
                        });
                },
            ]);

            app.post('/call/:session', [
                parseBodyText,
                (req, res) => {
                    this.api
                        .call({
                            session: req.params.session,
                            // @ts-expect-error
                            data: req.body,
                        })
                        .then(result => {
                            if (!result.success) {
                                res.statusCode = 400;
                                return res.end(str({ error: result.error }));
                            }
                            res.end(str(result.payload));
                        });
                },
            ]);

            app.post('/read/:session', [
                parseBodyJSON,
                (req, res) => {
                    this.api.receive({ session: req.params.session }).then(result => {
                        if (!result.success) {
                            res.statusCode = 400;
                            return res.end(str({ error: result.error }));
                        }
                        res.end(str(result.payload));
                    });
                },
            ]);

            app.post('/post/:session', [
                parseBodyText,
                (req, res) => {
                    this.api
                        .send({
                            session: req.params.session,
                            // @ts-expect-error
                            data: req.body,
                        })
                        .then(result => {
                            if (!result.success) {
                                res.statusCode = 400;
                                return res.end(str({ error: result.error }));
                            }
                            res.end();
                        });
                },
            ]);

            app.get('/', [
                (_req, res) => {
                    res.writeHead(301, {
                        Location: `http://127.0.0.1:${this.port}/status`,
                    });
                },
            ]);

            app.get('/status', [
                async (req, res) => {
                    const language =
                        languageHeaderParser.parse(req.headers['accept-language'])[0]?.code || 'en';

                    const enumerateResult = await this.api.enumerate();
                    const props = {
                        intro: `To download full logs go to http://127.0.0.1:${this.port}/logs`,
                        version: this.version,
                        devices: enumerateResult.success ? enumerateResult.payload.descriptors : [],
                        language,
                        logs: app.logger.getLog().slice(-20),
                    };

                    res.end(JSON.stringify(props, null, 2));
                },
            ]);

            app.get('/logs', [
                (_req, res) => {
                    res.writeHead(200, {
                        'Content-Type': 'text/plain',
                        'Content-Disposition': 'attachment; filename=trezor-bridge.txt',
                    });
                    res.end(
                        app.logger
                            .getLog()
                            .map(l => l.message.join('. '))
                            .join('.\n'),
                    );
                },
            ]);

            app.post('/', [
                (_req, res) => {
                    res.writeHead(200, { 'Content-Type': 'text/plain' });
                    res.end(
                        str({
                            version: this.version,
                        }),
                    );
                },
            ]);

            app.start().then(() => {
                this.server = app;
                resolve();
            });
        });
    }

    public stop() {
        // send empty descriptors (imitate that all devices have disconnected)
        this.resolveListenSubscriptions([]);
        this.server?.stop();
    }

    public async status() {
        const running = await fetch(`http://127.0.0.1:${this.port}/`)
            .then(resp => resp.ok)
            .catch(() => false);

        return {
            service: running,
            process: running,
        };
    }

    // compatibility with "BridgeProcess" type
    public startDev() {
        return this.start();
    }

    // compatibility with "BridgeProcess" type
    public startTest() {
        return this.start();
    }
}
