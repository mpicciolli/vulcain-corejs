// Entry point
import * as express from 'express';
import * as os from 'os';
import * as http from 'http';
import {IContainer} from '../di/resolvers';
import {CommandManager, CommandMetadata} from '../pipeline/commands';
import {QueryManager} from '../pipeline/query';
import {IManager} from '../pipeline/common';
import {BadRequestError, Logger} from '@sovinty/vulcain-configurations';
import {RequestContext} from './requestContext';

export abstract class AbstractAdapter {
    private _logger: Logger;
    private commandManager;
    private queryManager;

    constructor(protected domainName:string, protected container: IContainer) {
        this.commandManager = new CommandManager(container);
        this.queryManager = new QueryManager(container);
    }

    public abstract start(port:number);
    public abstract setStaticRoot(basePath: string);
    public abstract useMiddleware(verb: string, path: string, handler: Function);

    protected executeQueryRequest(query, ctx){
        return this.executeRequestInternal(this.queryManager, query, ctx);
    }

    protected executeCommandRequest(command, ctx){
        return this.executeRequestInternal(this.commandManager, command, ctx);
    }

    private executeRequestInternal(manager: IManager, command, ctx:RequestContext): Promise<{ code: number, value:any, headers:Map<string,string>}> {
        let self = this;
        return new Promise((resolve) => {
            let headers = new Map<string, string>();
            if (command.domain.toLowerCase() !== self.domainName.toLowerCase()) {
                resolve({ value: "this service doesn't belong to domain " + self.domainName, code: 400, headers: headers });
                return;
            }
            if (!command || !command.action || !command.domain) {
                resolve({ value: "action and domain are required.", code: 400, headers: headers });
                return;
            }
            command.version = command.version || "1";
            if (command.version[0] === "v" || command.version[0] === "V")
                command.version = command.version.substr(1);

            try {
                let metadata = <CommandMetadata>manager.getMetadata(command);
                ctx.logger = self._logger;

                let code;
                if (metadata.scope && (code = ctx.hasScope(metadata.scope))) {
                    resolve({ code: code, value: http.STATUS_CODES[code] });
                    return;
                }
            }
            catch (e) {
                resolve({ value: e.message || e.toString(), code: 500, headers: headers });
                return;
            }

            manager.runAsync(command, ctx)
                .then(result => {
                    if(command.correlationId)
                        headers.set("X-VULCAIN-CORRELATION-ID", command.correlationId);
                    resolve({ value: result, headers: headers });
                })
                .catch(result => {
                    resolve( { code: 500, value: result, headers:headers });
                });
        });
    }
}