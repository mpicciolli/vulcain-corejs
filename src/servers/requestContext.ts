import {Logger} from 'vulcain-configurationsjs';
import {Container} from '../di/containers';
import {IContainer} from '../di/resolvers';
import {CommandFactory} from '../commands/command/commandFactory';
import {ICommand} from '../commands/command/abstractCommand'
import {DefaultServiceNames} from '../di/annotations';

let defaultLogger: Logger;

export enum Pipeline {
    EventNotification,
    InProcess,
    HttpRequest,
    Test
}

/**
 * User context
 *
 * @export
 * @interface UserContext
 */
export interface UserContext {
    id: string;
    displayName?: string;
    email?: string;
    name: string;
    scopes: Array<string>;
    tenant: string;
}

/**
 * Request context
 *
 * @export
 * @class RequestContext
 */
export class RequestContext {
    static TestTenant = "_test_";
    static TestUser = { id: "test", scopes: ["*"], name: "test", displayName: "test", email: "test", tenant: RequestContext.TestTenant };

    /**
     * Current user or null
     *
     * @type {UserContext}
     */
    public user: UserContext;
    private _cache: Map<string, any>;
    public logger: Logger;
    public container: IContainer;
    /**
     * Headers for the current request
     *
     * @type {{ [name: string]: string }}
     */
    public requestHeaders: { [name: string]: string };
    private _responseHeaders: Map<string, string>;
    /**
     * Used to override default response code (200)
     *
     * @type {number}
     */
    public responseCode: number;
    /**
     * Current tenant
     *
     * @type {string}
     */
    public tenant: string;

    /**
     * Do not use
     *
     * @returns
     */
    getResponseHeaders() {
        return this._responseHeaders;
    }

    /**
     * Add a custom header value to the response
     *
     * @param {string} name
     * @param {string} value
     */
    addHeader(name: string, value: string) {
        if (!this._responseHeaders)
            this._responseHeaders = new Map<string, string>();
        this._responseHeaders.set(name, value);
    }

    /**
     * Get request cache (Cache is only valid during the request lifetime)
     *
     * @readonly
     */
    get cache() {
        if (!this._cache) {
            this._cache = new Map<string, any>();
        }
        return this._cache;
    }

    /**
     * Do not use directly
     * Creates an instance of RequestContext.
     *
     * @param {IContainer} container
     * @param {Pipeline} pipeline
     */
    constructor(container: IContainer, public pipeline: Pipeline) {
        this.logger = (defaultLogger = defaultLogger || container.get<Logger>(DefaultServiceNames.Logger));
        this.container = new Container(container);
        this.container.injectInstance(this, DefaultServiceNames.RequestContext);
    }

    dispose() {
        this.container.dispose();
    }

    /**
     * Create a request context for testing
     *
     * @static
     * @param {IContainer} [container]
     * @param {UserContext} [user]
     * @returns
     */
    static createMock(container?: IContainer, user?:UserContext) {
        let ctx = new RequestContext(container || new Container(), Pipeline.Test);
        ctx.tenant = RequestContext.TestTenant;
        ctx.user = user || RequestContext.TestUser;
        return ctx;
    }

    /**
     * Get user scopes
     *
     * @readonly
     * @type {Array<string>}
     */
    get scopes(): Array<string> {
        return (this.user && this.user.scopes) || [];
    }

    /**
     * Check if the current user has a specific scope
     *
     * Rules:
     *   scope      userScope   Result
     *   null/?/*                 true
     *                  null      false
     *                   *        true
     *     x             x        true
     *     x-yz         x-*       true
     *
     * @param {string} scope
     * @returns {number}
     */
    hasScope(scope: string): boolean {
        if (this.user && this.user.tenant && this.user.tenant !== this.tenant) return false;

        if (!scope || scope === "?") return true;
        if (!this.user) return false;
        if (scope === "*") return true;

        const scopes = this.scopes;

        if (!scopes || scopes.length == 0) return false;
        if (scopes[0] === "*") return true;

        for (let userScope of this.user.scopes) {
            for (let sc of scopes) {
                if (userScope === sc) return true;
                // admin-* means all scope beginning by admin-
                if (userScope.endsWith("*") && sc.startsWith(userScope.substr(0, userScope.length - 1)))
                    return true;
            }
        }

        return false;
    }

    /**
     * Check if the current user is an admin
     *
     * @returns {boolean}
     */
    isAdmin(): boolean {
        return this.scopes && this.scopes.length > 0 && this.scopes[0] === "*";
    }

    /**
     * Create a new command
     * Throws an execption if the command is unknown
     *
     * @param {string} name Command name
     * @param {string} [schema] Optional schema used to initialize the provider
     * @returns {ICommand} A command
     */
    getCommand(name: string, schema?:string) {
        return CommandFactory.get(name, this, schema);
    }
}
