import { System } from './../globals/system';
import { IDynamicProperty } from './../dynamicProperty';
import * as util from 'util';

export class VulcainLogger {

    private static _enableInfo: IDynamicProperty<boolean>;

    private static get enableInfo() {
        if (!VulcainLogger._enableInfo)
            VulcainLogger._enableInfo = System && System.createServiceConfigurationProperty("enableVerboseLog", false);
        return VulcainLogger._enableInfo;
    }

    constructor() {
    }

    /**
     * Log an error
     *
     * @param {any} requestContext Current requestContext
     * @param {Error} error Error instance
     * @param {string} [msg] Additional message
     *
     * @memberOf VulcainLogger
     */
    error(requestContext, error: Error, msg?: string) {
        if (!error) return;
        if (VulcainLogger.enableInfo.value || System.isTestEnvironnment)
            this.write(requestContext, msg ? msg + ":" + error.stack : error.stack);
        else
            this.write(requestContext, msg ? msg + ":" + error.message : error.message);
    }

    /**
     * Log a message info
     *
     * @param {any} requestContext Current requestContext
     * @param {string} msg Message format (can include %s, %j ...)
     * @param {...Array<string>} params Message parameters
     *
     * @memberOf VulcainLogger
     */
    info(requestContext, msg: string, ...params: Array<any>) {
        this.write(requestContext, util.format(msg, ...params));
    }

    /**
     * Log a verbose message. Verbose message are enable by service configuration property : enableVerboseLog
     *
     * @param {any} requestContext Current requestContext
     * @param {string} msg Message format (can include %s, %j ...)
     * @param {...Array<string>} params Message parameters
     *
     * @memberOf VulcainLogger
     */
    verbose(requestContext, msg: string, ...params: Array<any>) {
        if (VulcainLogger.enableInfo.value || System.isTestEnvironnment)
            this.write(requestContext, util.format(msg, ...params));
    }

    /**
     * Don't use directly
     *
     * @param {any} requestContext
     * @param {any} info
     *
     * @memberOf VulcainLogger
     */
    write(requestContext, info) {
        let trace: any = {
            service: System.serviceName,
            version: System.serviceVersion,
            timestamp: System.nowAsString(),
            correlationId: requestContext && requestContext.correlationId,
            correlationPath: requestContext && requestContext.correlationPath
        };

        if (typeof info === "string")
        {
            trace.message = info;
        }
        else {
            trace.info = info;
        }
        if (System.isTestEnvironnment) {
            util.log(`${trace.correlationId}:${trace.correlationPath} - ${trace.message || (trace.info && JSON.stringify(trace.info))}`);
        }
        else {
            console.log("%j", trace);
        }
    }
}
