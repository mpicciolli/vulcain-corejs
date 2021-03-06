import { HandlerFactory, CommonRequestData, CommonActionMetadata, ServiceHandlerMetadata, ErrorResponse, CommonRequestResponse, IManager, HttpResponse } from './common';
import {IContainer} from '../di/resolvers';
import {Domain} from '../schemas/schema';
import * as os from 'os';
import {RequestContext, UserContext} from '../servers/requestContext';
import {DefaultServiceNames} from '../di/annotations';
import { ServiceDescriptors } from './serviceDescriptions';
import { System } from './../configurations/globals/system';
import { CommandRuntimeError } from './../errors/commandRuntimeError';

export interface QueryData extends CommonRequestData {
    maxByPage?: number;
    page?: number;
}

export interface QueryResponse<T> extends CommonRequestResponse<T> {
    maxByPage?: number;
    page?: number;
    totalPages?: number;
    total?: number;
}

/**
 *
 *
 * @export
 * @interface QueryMetadata
 * @extends {ServiceHandlerMetadata}
 */
export interface QueryMetadata extends ServiceHandlerMetadata {
}

/**
 * 
 *
 * @export
 * @interface QueryActionMetadata
 * @extends {CommonActionMetadata}
 */
export interface QueryActionMetadata extends CommonActionMetadata {
    outputSchema?: string | Function;
}

export class QueryManager implements IManager {
    private _domain: Domain;
    private _hostname: string;
    private _serviceDescriptors: ServiceDescriptors;

    /**
     * Get the current domain model
     * @returns {Domain}
     */
    get domain() {
        if (!this._domain) {
            this._domain = this.container.get<Domain>(DefaultServiceNames.Domain);
        }
        return this._domain;
    }

    constructor(public container: IContainer) {
        this._hostname = os.hostname();
    }

    private createResponse(ctx: RequestContext, query: QueryData, error?: ErrorResponse) {
        let res: QueryResponse<any> = {
            tenant: ctx.tenant,
            userContext: query.userContext,
            source: this._hostname,
            schema: query.schema,
            domain: query.domain,
            action: query.action,
            maxByPage: query.maxByPage,
            page: query.page
        };
        if (error)
            res.error = { message: error.message, errors: error.errors };
        return res;
    }

    getInfoHandler(command: CommonRequestData, container?:IContainer) {
        if (!this._serviceDescriptors) {
            this._serviceDescriptors = this.container.get<ServiceDescriptors>(DefaultServiceNames.ServiceDescriptors);
        }
        let info = this._serviceDescriptors.getHandlerInfo<QueryActionMetadata>(container, command.schema, command.action);
        return info;
    }

    private async validateRequestData(info, query) {
        let errors;
        let inputSchema = info.metadata.inputSchema;
        if (inputSchema && inputSchema !== "none") {
            let schema = inputSchema && this.domain.getSchema(inputSchema);
            if (schema) {
                query.inputSchema = schema.name;

                // Custom binding if any
                 query.params = schema.bind(query.params);

                errors = schema.validate(query.params);
                if (errors && !Array.isArray(errors))
                    errors = [errors];
            }

            if (!errors || errors.length === 0) {
                // Search if a method naming validate<schema>[Async] exists
                let methodName = 'validate' + inputSchema;
                let altMethodName = methodName + 'Async';
                errors = info.handler[methodName] && info.handler[methodName](query.params, query.action);
                if (!errors)
                    errors = info.handler[altMethodName] && await info.handler[altMethodName](query.params, query.action);
                if (errors && !Array.isArray(errors))
                    errors = [errors];
            }
        }
        return errors;
    }

    async runAsync(query: QueryData, ctx: RequestContext): Promise<any> {
        let info = this.getInfoHandler(query, ctx.container);
        if (info.kind !== "query")
            throw new Error("Action handler must be requested with POST.");

        System.log.write(ctx, { runQuery: query });

        try {
            let errors = await this.validateRequestData(info, query);
            if (errors && errors.length > 0)
                return this.createResponse(ctx, query, { message: "Validation errors", errors: errors });
            if (ctx.user)
                query.userContext = <UserContext>{ id: ctx.user.id, scopes: ctx.user.scopes, name: ctx.user.name, displayName: ctx.user.displayName, tenant: ctx.user.tenant };
            query.schema = <string>info.metadata.schema;
            query.correlationId = ctx.correlationId;
            query.correlationPath = ctx.correlationPath;
            info.handler.requestContext = ctx;
            info.handler.query = query;
            let result = await info.handler[info.method](query.params);
            if (result instanceof HttpResponse) {
                return result; // skip normal process
            }
            let res = this.createResponse(ctx, query);
            res.value = HandlerFactory.obfuscateSensibleData(this.domain, this.container, result);
            if (result && Array.isArray(result)) {
                res.total = result.length;
            }
            return res;
        }
        catch (e) {
            let error = (e instanceof CommandRuntimeError) ? e.error : e;
            return this.createResponse(ctx, query, error);
        }
    }
}
